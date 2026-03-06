const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Movie = require("./models/Movie");
const Show = require("./models/Show");
const Booking = require("./models/Booking");
const User = require("./models/User");

const MONGO_URI =
  process.env.MONGO_URI || "mongodb://127.0.0.1:27017/movie_booking_system";

const movieData = [
  {
    title: "The Campus Heist",
    genre: "Thriller",
    duration: 128,
    language: "English",
    rating: "UA",
    description: "A group of students plans an unforgettable heist during annual fest.",
    posterUrl:
      "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=60",
  },
  {
    title: "Code & Coffee",
    genre: "Romance",
    duration: 110,
    language: "English",
    rating: "U",
    description: "Two developers meet at a hackathon and debug life together.",
    posterUrl:
      "https://images.unsplash.com/photo-1512427691650-0572f7b9f641?auto=format&fit=crop&w=600&q=60",
  },
  {
    title: "Galaxy Internship",
    genre: "Sci-Fi",
    duration: 142,
    language: "English",
    rating: "UA",
    description: "An intern gets assigned to a secret mission beyond Earth.",
    posterUrl:
      "https://images.unsplash.com/photo-1502134249126-9f3755a50d78?auto=format&fit=crop&w=600&q=60",
  },
];

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);

    await Booking.deleteMany({});
    await Show.deleteMany({});
    await Movie.deleteMany({});
    await User.deleteMany({});

    // Create default admin user
    const hashedPassword = await bcrypt.hash("admin123", 10);
    await User.create({
      name: "Admin",
      email: "admin@admin.com",
      password: hashedPassword,
      role: "admin",
    });

    console.log("Admin user created: admin@admin.com / admin123");

    const movies = await Movie.insertMany(movieData);

    const now = new Date();

    const showData = [
      {
        movie: movies[0]._id,
        theater: "Auditorium 1",
        showTime: new Date(now.getTime() + 3 * 60 * 60 * 1000),
        totalSeats: 40,
        availableSeats: 40,
        price: 40,
      },
      {
        movie: movies[0]._id,
        theater: "Auditorium 1",
        showTime: new Date(now.getTime() + 8 * 60 * 60 * 1000),
        totalSeats: 40,
        availableSeats: 40,
        price: 45,
      },
      {
        movie: movies[1]._id,
        theater: "Auditorium 2",
        showTime: new Date(now.getTime() + 4 * 60 * 60 * 1000),
        totalSeats: 50,
        availableSeats: 50,
        price: 35,
      },
      {
        movie: movies[2]._id,
        theater: "Auditorium 3",
        showTime: new Date(now.getTime() + 6 * 60 * 60 * 1000),
        totalSeats: 60,
        availableSeats: 60,
        price: 49,
      },
    ];

    await Show.insertMany(showData);

    console.log("Sample data inserted successfully.");
    process.exit(0);
  } catch (error) {
    console.error("Failed to seed data:", error.message);
    process.exit(1);
  }
}

seed();
