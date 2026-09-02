const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  code: {
    type: String,
    required: true,
  },
  language: {
    type: String,
    required: true,
  },
  review: {
    type: String,
    required: true,
  },
  qualityScore: {
    type: Number,
    default: null,
  },
}, { timestamps: true });

module.exports = mongoose.model("Review", reviewSchema);