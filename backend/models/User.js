const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  // Not required for Google or GitHub sign-in accounts - they have no
  // password at all. A normal email/password account must still have one.
  password: {
    type: String,
    required: function () {
      return !this.googleId && !this.githubId;
    },
  },
  googleId: { type: String, default: null },
  githubId: { type: String, default: null },
  isAdmin: { type: Boolean, default: false },
  resetPasswordToken: { type: String, default: null },
  resetPasswordExpires: { type: Date, default: null },
  profilePhoto: { type: String, default: null },
}, { timestamps: true });

// Hash password before saving (only runs if a password was actually set)
userSchema.pre("save", async function () {
  if (!this.isModified("password") || !this.password) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Safely returns false instead of crashing for password-less OAuth accounts
userSchema.methods.comparePassword = async function (enteredPassword) {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);