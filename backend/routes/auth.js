const express = require("express");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
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

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ---------------------------------------------------------------------
// POST /api/auth/register  (step 1: submit details, receive OTP by email)
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
// POST /api/auth/verify-registration-otp
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

    pending.expiresAt = expiresAt;
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
// POST /api/auth/google  (NEW - Google Sign-In)
// Frontend sends the ID token Google gave it after the user picks an
// account. We verify that token really came from Google and really is
// for our app, then find-or-create a user and log them in exactly like
// any other login (same JWT, same response shape).
// ---------------------------------------------------------------------
router.post("/google", async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ error: "Missing Google credential" });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { email, name, sub: googleId, picture } = payload;

    let user = await User.findOne({ email });

    if (!user) {
      // Brand new user signing in with Google for the first time
      user = await User.create({
        name,
        email,
        googleId,
        profilePhoto: picture || null,
      });
    } else if (!user.googleId) {
      // An existing email/password account is using Google sign-in for
      // the first time - link the two together rather than creating a
      // duplicate account for the same email.
      user.googleId = googleId;
      await user.save();
    }

    const token = generateToken(user._id);

    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, isAdmin: user.isAdmin },
    });
  } catch (error) {
    res.status(401).json({ error: "Google sign-in failed: " + error.message });
  }
});

// ---------------------------------------------------------------------
// POST /api/auth/github  (NEW - GitHub Sign-In)
// Frontend's callback page sends us the temporary "code" GitHub gave it.
// We exchange that code for an access token, use the token to fetch the
// user's GitHub profile + email, then find-or-create a user exactly like
// the Google flow.
// ---------------------------------------------------------------------
router.post("/github", async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ error: "Missing GitHub code" });
    }

    // Step 1: exchange the code for an access token
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      }),
    });
    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      return res.status(401).json({ error: "GitHub sign-in failed: invalid code" });
    }
    const accessToken = tokenData.access_token;

    // Step 2: fetch the GitHub profile (User-Agent header is required by GitHub's API)
    const profileRes = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": "CodeSense-AI",
      },
    });
    const profile = await profileRes.json();

    // Step 3: GitHub's profile.email can be null if the user's email is
    // private, so fall back to the emails endpoint and pick the verified
    // primary one.
    let email = profile.email;
    if (!email) {
      const emailsRes = await fetch("https://api.github.com/user/emails", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "User-Agent": "CodeSense-AI",
        },
      });
      const emails = await emailsRes.json();
      const primary = Array.isArray(emails)
        ? emails.find((e) => e.primary && e.verified)
        : null;
      email = primary ? primary.email : null;
    }

    if (!email) {
      return res.status(400).json({
        error: "Your GitHub account has no verified email available. Please add one on GitHub and try again.",
      });
    }

    const githubId = String(profile.id);
    const name = profile.name || profile.login;

    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        name,
        email,
        githubId,
        profilePhoto: profile.avatar_url || null,
      });
    } else if (!user.githubId) {
      user.githubId = githubId;
      await user.save();
    }

    const token = generateToken(user._id);

    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, isAdmin: user.isAdmin },
    });
  } catch (error) {
    res.status(401).json({ error: "GitHub sign-in failed: " + error.message });
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
// POST /api/auth/forgot-password  (unchanged)
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
// POST /api/auth/reset-password  (unchanged)
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