const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Otp = require("../models/Otp");
const PendingRegistration = require("../models/PendingRegistration");
const protect = require("../middleware/authMiddleware");
const { generateOtp, hashOtp, verifyOtp } = require("../utils/otpService");
const { sendOtpEmail } = require("../utils/mailer");

const router = express.Router();

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_OTP_ATTEMPTS = 5;

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

// ---------------------------------------------------------------------
// POST /api/auth/register  (step 1: submit details, receive OTP by email)
// Nothing is saved to the real Users collection yet.
// ---------------------------------------------------------------------
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "Email already registered" });
    }

    // Replace any previous unfinished attempt for this email
    await PendingRegistration.deleteOne({ email });
    await Otp.deleteMany({ email, purpose: "register" });

    const expiresAt = new Date(Date.now() + OTP_TTL_MS);
    await PendingRegistration.create({ name, email, password, expiresAt });

    const otp = generateOtp();
    await Otp.create({
      email,
      purpose: "register",
      hashedOtp: hashOtp(otp),
      expiresAt,
    });

    await sendOtpEmail(email, otp, "register");

    res.status(200).json({
      message: "OTP sent to your email. Enter it to complete registration.",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------------------
// POST /api/auth/verify-registration-otp  (step 2: OTP confirmed -> account created)
// ---------------------------------------------------------------------
router.post("/verify-registration-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ error: "Email and OTP are required" });
    }

    const otpRecord = await Otp.findOne({ email, purpose: "register" }).sort({
      createdAt: -1,
    });
    if (!otpRecord) {
      return res.status(400).json({
        error: "OTP expired or not found. Please register again.",
      });
    }
    if (otpRecord.attempts >= MAX_OTP_ATTEMPTS) {
      return res.status(429).json({
        error: "Too many incorrect attempts. Please register again.",
      });
    }

    if (!verifyOtp(otp, otpRecord.hashedOtp)) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      return res.status(400).json({ error: "Incorrect OTP" });
    }

    const pending = await PendingRegistration.findOne({ email });
    if (!pending) {
      return res.status(400).json({
        error: "Registration expired. Please register again.",
      });
    }

    // Plain password here is intentional -- User's pre-save hook hashes it.
    await User.create({
      name: pending.name,
      email: pending.email,
      password: pending.password,
    });

    await PendingRegistration.deleteOne({ email });
    await Otp.deleteMany({ email, purpose: "register" });

    res.status(201).json({
      message: "Account verified successfully. You can now log in.",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------------------
// POST /api/auth/resend-registration-otp
// ---------------------------------------------------------------------
router.post("/resend-registration-otp", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    const pending = await PendingRegistration.findOne({ email });
    if (!pending) {
      return res.status(400).json({
        error: "No pending registration found for this email. Please register again.",
      });
    }

    await Otp.deleteMany({ email, purpose: "register" });

    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);
    await Otp.create({
      email,
      purpose: "register",
      hashedOtp: hashOtp(otp),
      expiresAt,
    });

    pending.expiresAt = expiresAt; // keep pending record alive alongside new OTP
    await pending.save();

    await sendOtpEmail(email, otp, "register");
    res.json({ message: "A new OTP has been sent to your email." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------------------
// POST /api/auth/login  (unchanged)
// ---------------------------------------------------------------------
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = generateToken(user._id);

    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, isAdmin: user.isAdmin },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------------------
// GET /api/auth/me  (unchanged)
// ---------------------------------------------------------------------
router.get("/me", protect, async (req, res) => {
  res.json({
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      createdAt: req.user.createdAt,
      profilePhoto: req.user.profilePhoto,
    },
  });
});

// ---------------------------------------------------------------------
// PUT /api/auth/change-password  (unchanged)
// ---------------------------------------------------------------------
router.put("/change-password", protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Both fields are required" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const user = await User.findById(req.user._id);
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------------------
// PUT /api/auth/update-photo  (unchanged)
// ---------------------------------------------------------------------
router.put("/update-photo", protect, async (req, res) => {
  try {
    const { profilePhoto } = req.body;

    if (!profilePhoto) {
      return res.status(400).json({ error: "No photo provided" });
    }

    const sizeInBytes = Buffer.byteLength(profilePhoto, "base64");
    if (sizeInBytes > 2 * 1024 * 1024) {
      return res.status(400).json({ error: "Image too large. Please use an image under 2MB" });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { profilePhoto },
      { new: true }
    );

    res.json({ message: "Profile photo updated", profilePhoto: user.profilePhoto });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------------------
// POST /api/auth/forgot-password  (step 1: request OTP)
// Response is identical whether or not the email exists, so an attacker
// can't use this endpoint to find out which emails have accounts.
// ---------------------------------------------------------------------
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const user = await User.findOne({ email });
    if (user) {
      await Otp.deleteMany({ email, purpose: "reset" });
      const otp = generateOtp();
      const expiresAt = new Date(Date.now() + OTP_TTL_MS);
      await Otp.create({ email, purpose: "reset", hashedOtp: hashOtp(otp), expiresAt });
      await sendOtpEmail(email, otp, "reset");
    }

    res.json({ message: "If that email is registered, an OTP has been sent to it." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------------------
// POST /api/auth/reset-password  (step 2: verify OTP + set new password)
// ---------------------------------------------------------------------
router.post("/reset-password", async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: "Email, OTP and new password are required" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const otpRecord = await Otp.findOne({ email, purpose: "reset" }).sort({
      createdAt: -1,
    });
    if (!otpRecord) {
      return res.status(400).json({ error: "OTP expired or not found. Please try again." });
    }
    if (otpRecord.attempts >= MAX_OTP_ATTEMPTS) {
      return res.status(429).json({ error: "Too many incorrect attempts. Please request a new OTP." });
    }
    if (!verifyOtp(otp, otpRecord.hashedOtp)) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      return res.status(400).json({ error: "Incorrect OTP" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "No account found with that email" });
    }

    user.password = newPassword;
    await user.save();
    await Otp.deleteMany({ email, purpose: "reset" });

    res.json({ message: "Password reset successfully. You can now log in." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;