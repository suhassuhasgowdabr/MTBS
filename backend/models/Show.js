const mongoose = require("mongoose");

const showSchema = new mongoose.Schema(
  {
    movie: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Movie",
      required: true,
    },
    theater: {
      type: String,
      required: true,
      trim: true,
    },
    showTime: {
      type: Date,
      required: true,
    },
    totalSeats: {
      type: Number,
      default: 40,
      min: 1,
    },
    availableSeats: {
      type: Number,
      default: 40,
      min: 0,
    },
    price: {
      type: Number,
      required: true,
      min: 1,
      max: 49,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Show", showSchema);
