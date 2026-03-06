const express = require("express");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const Booking = require("../models/Booking");
const Show = require("../models/Show");
const Movie = require("../models/Movie");
const User = require("../models/User");
const { requireAuth, requireAdmin } = require("../middleware/authMiddleware");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "movie_booking_secret_key";

router.post("/book-ticket", async (req, res) => {
  try {
    const { movieId, showId, customerName, customerEmail, seatCount, selectedSeats, userId } = req.body;

    if (!movieId || !showId || !customerName || !customerEmail || !seatCount) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const movie = await Movie.findById(movieId);
    if (!movie) {
      return res.status(404).json({ message: "Movie not found" });
    }

    const show = await Show.findOne({ _id: showId, movie: movieId });
        let bookingUser = null;
        if (userId) {
          bookingUser = await User.findById(userId);
          if (!bookingUser) {
            return res.status(400).json({ message: "Invalid user ID" });
          }
        }

    if (!show) {
      return res.status(404).json({ message: "Show not found for this movie" });
    }

    if (show.price >= 50) {
      return res.status(400).json({ message: "Ticket price must be less than ₹50" });
    }

    const seatCountNumber = Number(seatCount);
    if (!Number.isInteger(seatCountNumber) || seatCountNumber < 1) {
      return res.status(400).json({ message: "Seat count must be a positive integer" });
    }

    if (show.availableSeats < seatCountNumber) {
      return res.status(400).json({ message: "Not enough seats available" });
    }

    const existingBookings = await Booking.find({ show: show._id }, { seatsBooked: 1 });
    const alreadyBookedSeats = new Set(
      existingBookings.flatMap((booking) => booking.seatsBooked)
    );

    let finalSeats = Array.isArray(selectedSeats) ? selectedSeats.map(Number) : [];

    if (finalSeats.length > 0) {
      if (finalSeats.length !== seatCountNumber) {
        return res.status(400).json({
          message: "Selected seat count must match requested seat count",
        });
      }

      const uniqueSeats = new Set(finalSeats);
      if (uniqueSeats.size !== finalSeats.length) {
        return res.status(400).json({ message: "Duplicate seats are not allowed" });
      }

      const isInvalidSeat = finalSeats.some(
        (seat) => !Number.isInteger(seat) || seat < 1 || seat > show.totalSeats
      );
      if (isInvalidSeat) {
        return res.status(400).json({ message: "Invalid seat numbers selected" });
      }

      const isAlreadyBooked = finalSeats.some((seat) => alreadyBookedSeats.has(seat));
      if (isAlreadyBooked) {
        return res.status(400).json({ message: "One or more selected seats are already booked" });
      }
    } else {
      finalSeats = [];
      for (let seat = 1; seat <= show.totalSeats && finalSeats.length < seatCountNumber; seat += 1) {
        if (!alreadyBookedSeats.has(seat)) {
          finalSeats.push(seat);
        }
      }

      if (finalSeats.length < seatCountNumber) {
        return res.status(400).json({ message: "Unable to auto-assign seats" });
      }
    }

    const updatedShow = await Show.findOneAndUpdate(
      { _id: show._id, availableSeats: { $gte: seatCountNumber } },
      { $inc: { availableSeats: -seatCountNumber } },
      { new: true }
    );

    if (!updatedShow) {
      return res.status(409).json({ message: "Show was updated. Please try again." });
    }

    const totalAmount = seatCountNumber * show.price;
    const accessCode = crypto.randomBytes(16).toString("hex");

    const booking = await Booking.create({
      user: bookingUser ? bookingUser._id : null,
      customerName,
      customerEmail,
      movie: movie._id,
      show: show._id,
      seatsBooked: finalSeats,
      totalAmount,
      accessCode,
    });

    const populatedBooking = await Booking.findById(booking._id)
      .populate("movie", "title genre duration language")
      .populate("show", "showTime theater price")
      .lean();

    res.status(201).json({
      message: "Ticket booked successfully",
      booking: populatedBooking,
    });
  } catch (error) {
    res.status(500).json({ message: "Booking failed", error: error.message });
  }
});

router.get("/bookings", requireAuth, requireAdmin, async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate("movie", "title")
      .populate("show", "showTime theater price")
      .sort({ createdAt: -1 });

    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch bookings", error: error.message });
  }
});

router.get("/bookings/:id", async (req, res) => {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    let viewer = null;

    if (token) {
      try {
        viewer = jwt.verify(token, JWT_SECRET);
      } catch (_error) {
        return res.status(401).json({ message: "Invalid or expired token" });
      }
    }

    const booking = await Booking.findById(req.params.id)
      .populate("movie", "title genre duration language")
      .populate("show", "showTime theater price totalSeats")
      .lean();

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const isAdmin = viewer?.role === "admin";
    const isOwner = Boolean(viewer?.id && booking.user && booking.user.toString() === viewer.id);
    const hasValidAccessCode = Boolean(
      req.query.accessCode && booking.accessCode === String(req.query.accessCode)
    );

    if (!isAdmin && !isOwner && !hasValidAccessCode) {
      return res.status(403).json({ message: "Not authorized to view this booking" });
    }

    res.json(booking);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch booking", error: error.message });
  }
});

router.post("/bookings/:id/pay", async (req, res) => {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    const requestAccessCode = req.body?.accessCode;
    const utrNumber = req.body?.utrNumber;
    let viewer = null;

    if (token) {
      try {
        viewer = jwt.verify(token, JWT_SECRET);
      } catch (_error) {
        return res.status(401).json({ message: "Invalid or expired token" });
      }
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const isAdmin = viewer?.role === "admin";
    const isOwner = Boolean(viewer?.id && booking.user && booking.user.toString() === viewer.id);
    const hasValidAccessCode = Boolean(
      requestAccessCode && booking.accessCode === String(requestAccessCode)
    );

    if (!isAdmin && !isOwner && !hasValidAccessCode) {
      return res.status(403).json({ message: "Not authorized to complete payment for this booking" });
    }

    const normalizedUtr = typeof utrNumber === "string" ? utrNumber.trim() : "";

    if (booking.paymentStatus !== "paid") {
      booking.paymentStatus = "paid";
      booking.paidAt = new Date();
      booking.paymentMethod = "phonepe_qr";
    }

    if (normalizedUtr) {
      booking.utrNumber = normalizedUtr;
    }

    await booking.save();

    const populatedBooking = await Booking.findById(booking._id)
      .populate("movie", "title genre duration language")
      .populate("show", "showTime theater price totalSeats")
      .lean();

    res.json({
      message: "Payment marked as successful",
      booking: populatedBooking,
    });
  } catch (error) {
    res.status(500).json({ message: "Payment update failed", error: error.message });
  }
});

module.exports = router;
