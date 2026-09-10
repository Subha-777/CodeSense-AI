const crypto = require("crypto");

// 6-digit numeric OTP, e.g. "042917"
function generateOtp() {
  return String(crypto.randomInt(0, 1000000)).padStart(6, "0");
}

// Never store the raw OTP — hash it the same way you'd hash a password,
// so a DB leak doesn't expose active login codes.
function hashOtp(otp) {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

function verifyOtp(rawOtp, hashedOtp) {
  return hashOtp(rawOtp) === hashedOtp;
}

module.exports = { generateOtp, hashOtp, verifyOtp };