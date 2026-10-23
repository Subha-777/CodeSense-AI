const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Review = require("../models/Review");
const protect = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminMiddleware");

// Work out a program name from the code (the DB does not store one)
function getProgramName(code) {
  const patterns = [
    /class\s+(\w+)/,                                                    // Java, C#, Python, JS
    /def\s+(\w+)/,                                                      // Python
    /function\s+(\w+)/,                                                 // JavaScript, PHP
    /(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?(?:function|\()/,     // JS arrow / function
    /\bfn\s+(\w+)/,                                                    // Rust
    /\bfunc\s+(\w+)/,                                                  // Go
    /\b(?:int|void|float|double|char|long|bool|string|auto)\s+(\w+)\s*\(/, // C / C++
  ];
  for (const p of patterns) {
    const m = code.match(p);
    if (m) return m[1];
  }
  // Fallback: first non-empty line, shortened
  const firstLine = code.split("\n").find((l) => l.trim()) || "Untitled";
  return firstLine.trim().slice(0, 30);
}

// All admin routes require login + admin role
router.use(protect, adminOnly);

// GET /api/admin/stats — overall platform statistics
router.get("/stats", async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalReviews = await Review.countDocuments();

    // Reviews grouped by language
    const languageStats = await Review.aggregate([
      { $group: { _id: "$language", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Average quality score across all reviews
    const scoreStats = await Review.aggregate([
      { $match: { qualityScore: { $ne: null } } },
      { $group: { _id: null, avgScore: { $avg: "$qualityScore" } } },
    ]);
    const averageScore = scoreStats.length > 0
      ? Math.round(scoreStats[0].avgScore)
      : null;

    // Reviews per day (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    // Start of the day 6 days ago in India time (IST), so we get 7 full calendar days
    const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
    const startOfTodayIST = new Date(Date.now() + IST_OFFSET_MS);
    startOfTodayIST.setUTCHours(0, 0, 0, 0);
    const activityStart = new Date(
      startOfTodayIST.getTime() - IST_OFFSET_MS - 6 * 24 * 60 * 60 * 1000
    );

    const recentActivity = await Review.aggregate([
      { $match: { createdAt: { $gte: activityStart } } },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "Asia/Kolkata" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Per-day review details (program language, name, size, score, time)
    const recentReviews = await Review.find({ createdAt: { $gte: activityStart } })
      .select("code language qualityScore createdAt")
      .sort({ createdAt: -1 })
      .lean();

    const dayMap = {};
    recentReviews.forEach((r) => {
      const date = new Date(r.createdAt).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
      if (!dayMap[date]) dayMap[date] = [];
      dayMap[date].push({
        time: r.createdAt,
        language: r.language,
        programName: getProgramName(r.code),
        lines: r.code.split("\n").length,
        score: r.qualityScore,
      });
    });

    const dailyReviews = Object.keys(dayMap)
      .sort()
      .reverse()
      .map((date) => ({ date, total: dayMap[date].length, reviews: dayMap[date] }));

    // Reviews in last 24 hours
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    const reviewsLast24h = await Review.countDocuments({
      createdAt: { $gte: oneDayAgo },
    });

    // New users in last 7 days
    const newUsersThisWeek = await User.countDocuments({
      createdAt: { $gte: sevenDaysAgo },
    });

    // Most active users (top 5)
    const mostActiveUsers = await Review.aggregate([
      { $group: { _id: "$userId", reviewCount: { $sum: 1 } } },
      { $sort: { reviewCount: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $project: {
          name: "$user.name",
          email: "$user.email",
          reviewCount: 1,
        },
      },
    ]);

    res.json({
      totalUsers,
      totalReviews,
      averageScore,
      languageStats,
      recentActivity,
      dailyReviews,
      reviewsLast24h,
      newUsersThisWeek,
      mostActiveUsers,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/users — list all users with their review count
router.get("/users", async (req, res) => {
  try {
    const users = await User.find({}, "-password").sort({ createdAt: -1 });

    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const reviewCount = await Review.countDocuments({ userId: user._id });
        const lastReview = await Review.findOne({ userId: user._id })
          .sort({ createdAt: -1 })
          .select("createdAt language qualityScore");

        const userScoreStats = await Review.aggregate([
          { $match: { userId: user._id, qualityScore: { $ne: null } } },
          { $group: { _id: null, avgScore: { $avg: "$qualityScore" } } },
        ]);

        return {
          id: user._id,
          name: user.name,
          email: user.email,
          isAdmin: user.isAdmin,
          joinedAt: user.createdAt,
          reviewCount,
          avgScore: userScoreStats.length > 0
            ? Math.round(userScoreStats[0].avgScore)
            : null,
          lastReview: lastReview ? lastReview.createdAt : null,
          lastLanguage: lastReview ? lastReview.language : null,
          lastScore: lastReview ? lastReview.qualityScore : null,
        };
      })
    );

    res.json({ users: usersWithStats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/admin/users/:id — remove a user and their reviews
router.delete("/users/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.isAdmin) return res.status(400).json({ error: "Cannot delete an admin account" });

    await Review.deleteMany({ userId: req.params.id });
    await User.findByIdAndDelete(req.params.id);

    res.json({ message: "User and their reviews deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/analytics — platform-wide analytics
router.get("/analytics", async (req, res) => {
  try {
    // Score distribution
    const scoreDistribution = await Review.aggregate([
      { $match: { qualityScore: { $ne: null } } },
      {
        $bucket: {
          groupBy: "$qualityScore",
          boundaries: [0, 20, 40, 60, 80, 101],
          default: "Other",
          output: { count: { $sum: 1 } },
        },
      },
    ]);

    const formattedDistribution = scoreDistribution.map((b) => ({
      range: b._id === 0 ? "0-19"
        : b._id === 20 ? "20-39"
        : b._id === 40 ? "40-59"
        : b._id === 60 ? "60-79"
        : "80-100",
      count: b.count,
    }));

    // Reviews per month (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const reviewsPerMonth = await Review.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
          count: { $sum: 1 },
          avgScore: { $avg: "$qualityScore" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({ scoreDistribution: formattedDistribution, reviewsPerMonth });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/system — system performance info
router.get("/system", async (req, res) => {
  try {
    const os = require("os");
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryUsagePercent = Math.round((usedMemory / totalMemory) * 100);

    const uptimeSeconds = process.uptime();
    const uptimeHours = Math.floor(uptimeSeconds / 3600);
    const uptimeMinutes = Math.floor((uptimeSeconds % 3600) / 60);

    // DB stats
    const totalReviews = await Review.countDocuments();
    const totalUsers = await User.countDocuments();

    // Oldest and newest review
    const oldestReview = await Review.findOne().sort({ createdAt: 1 }).select("createdAt");
    const newestReview = await Review.findOne().sort({ createdAt: -1 }).select("createdAt");

    res.json({
      server: {
        uptime: `${uptimeHours}h ${uptimeMinutes}m`,
        nodeVersion: process.version,
        platform: os.platform(),
        memoryUsagePercent,
        totalMemoryMB: Math.round(totalMemory / 1024 / 1024),
        usedMemoryMB: Math.round(usedMemory / 1024 / 1024),
        cpuCount: os.cpus().length,
        cpuModel: os.cpus()[0]?.model || "Unknown",
      },
      database: {
        totalUsers,
        totalReviews,
        oldestRecord: oldestReview?.createdAt || null,
        newestRecord: newestReview?.createdAt || null,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;