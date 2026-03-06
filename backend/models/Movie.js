const mongoose = require("mongoose");

const movieSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    genre: {
      type: String,
      required: true,
      trim: true,
    },
    duration: {
      type: Number,
      required: true,
    },
    language: {
      type: String,
      default: "English",
      trim: true,
    },
    rating: {
      type: String,
      default: "UA",
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    posterUrl: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Movie", movieSchema);
