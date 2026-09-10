const mongoose = require("mongoose");

// Holds a registration's details while the user proves they own the email.
// Nothing lands in the real User collection until the OTP is verified.
// NOTE: password is stored as plain text here, briefly — it gets hashed
// normally (via the User model's pre-save hook) only once the account is
// actually created. The 10-minute TTL below limits how long that exists.
const pendingRegistrationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  expiresAt: { type: Date, required: true },
});

pendingRegistrationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("PendingRegistration", pendingRegistrationSchema);