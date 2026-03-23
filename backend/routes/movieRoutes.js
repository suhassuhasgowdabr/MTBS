const express = require("express");
const Movie = require("../models/Movie");
const Show = require("../models/Show");
const Booking = require("../models/Booking");
const { requireAuth, requireAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const movies = await Movie.find().sort({ createdAt: -1 });
    const movieIds = movies.map((movie) => movie._id);

    const shows = await Show.find({ movie: { $in: movieIds } }).sort({ showTime: 1 });

    const showsByMovie = shows.reduce((accumulator, show) => {
      const movieId = show.movie.toString();
      if (!accumulator[movieId]) {
        accumulator[movieId] = [];
      }
      accumulator[movieId].push(show);
      return accumulator;
    }, {});

    const response = movies.map((movie) => ({
      ...movie.toObject(),
      shows: showsByMovie[movie._id.toString()] || [],
    }));

    res.json(response);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch movies", error: error.message });
  }
});

router.post("/", requireAuth, requireAdmin, async (req, res) => {
  try {
    const movie = await Movie.create(req.body);
    res.status(201).json(movie);
  } catch (error) {
    res.status(400).json({ message: "Failed to create movie", error: error.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);

    if (!movie) {
      return res.status(404).json({ message: "Movie not found" });
    }

    const shows = await Show.find({ movie: movie._id }).sort({ showTime: 1 });

    const showIds = shows.map((show) => show._id);
    const bookings = await Booking.find({ show: { $in: showIds } }, { show: 1, seatsBooked: 1 });

    const bookedSeatsByShow = {};
    for (const booking of bookings) {
      const showId = booking.show.toString();
      if (!bookedSeatsByShow[showId]) {
        bookedSeatsByShow[showId] = [];
      }
      bookedSeatsByShow[showId].push(...booking.seatsBooked);
    }

    const enrichedShows = shows.map((show) => {
      const showObject = show.toObject();
      showObject.bookedSeats = bookedSeatsByShow[show._id.toString()] || [];
      return showObject;
    });

    res.json({
      ...movie.toObject(),
      shows: enrichedShows,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch movie", error: error.message });
  }
});

router.post("/:id/shows", requireAuth, requireAdmin, async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);

    if (!movie) {
      return res.status(404).json({ message: "Movie not found" });
    }

    const { theater, showTime, totalSeats = 40, price } = req.body;
    const numericPrice = Number(price);

    if (!Number.isFinite(numericPrice) || numericPrice <= 0 || numericPrice >= 50) {
      return res.status(400).json({ message: "Ticket price must be greater than 0 and less than ₹50" });
    }

    const show = await Show.create({
      movie: movie._id,
      theater,
      showTime,
      totalSeats,
      availableSeats: totalSeats,
      price: numericPrice,
    });

    res.status(201).json(show);
  } catch (error) {
    res.status(400).json({ message: "Failed to add show timing", error: error.message });
  }
});

// DELETE a single show timing
router.delete("/:id/shows/:showId", requireAuth, requireAdmin, async (req, res) => {
  try {
    const show = await Show.findOneAndDelete({ _id: req.params.showId, movie: req.params.id });
    if (!show) {
      return res.status(404).json({ message: "Show not found" });
    }
    res.json({ message: "Show deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete show", error: error.message });
  }
});

// DELETE a movie and all its shows
router.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const movie = await Movie.findByIdAndDelete(req.params.id);
    if (!movie) {
      return res.status(404).json({ message: "Movie not found" });
    }
    await Show.deleteMany({ movie: req.params.id });
    res.json({ message: "Movie and its shows deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete movie", error: error.message });
  }
});

module.exports = router;

