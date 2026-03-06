# Movie Ticket Booking System

Simple full-stack web app for a college project.

## Tech Stack

- Frontend: HTML, CSS, JavaScript, Bootstrap
- Backend: Node.js, Express.js
- Database: MongoDB

## Features

### User Side
- Register and login
- View list of movies
- View movie details
- Check show timings
- Select seats and book tickets
- Pay using QR code (dynamic amount)
- View booking confirmation

### Admin Side
- Add new movies
- Add show timings
- View all bookings

## Project Structure

```
movie-booking-system
│
├── backend
│   ├── server.js
│   ├── seedData.js
│   ├── routes
│   │   ├── movieRoutes.js
│   │   ├── bookingRoutes.js
│   │   ├── authRoutes.js
│   ├── models
│   │   ├── User.js
│   │   ├── Movie.js
│   │   ├── Show.js
│   │   ├── Booking.js
│
├── frontend
│   ├── index.html
│   ├── movies.html
│   ├── booking.html
│   ├── payment.html
│   ├── confirmation.html
│   ├── login.html
│   ├── register.html
│   ├── style.css
│   └── script.js
│
└── package.json
```

## API Endpoints

- `GET /movies`
- `POST /movies` (admin only)
- `GET /movies/:id`
- `POST /auth/register`
- `POST /auth/login`
- `POST /book-ticket`
- `GET /bookings`

Additional helper endpoints:
- `POST /movies/:id/shows` (admin only)
- `GET /bookings/:id` (owner/admin with token, or with `accessCode` query)
- `POST /bookings/:id/pay` (owner/admin with token, or with `accessCode`)

### Booking Flow

The complete booking process follows this sequence:

1. **Select Movie & Show** (`booking.html`)
   - Browse available movies and select a show timing
   - Choose seat count and select specific seats
   - Click "Confirm Booking"

2. **Payment Page** (`payment.html`)
   - Booking is created with status `pending`
   - QR code is displayed (uploaded image preferred, dynamic as fallback)
   - User scans QR and completes payment
   - Click "I Have Paid" button to mark payment complete

3. **Confirmation** (`confirmation.html`)
   - Only accessible after payment is marked as `paid`
   - Displays booking details with "Payment: Paid" status
   - If accessed before payment, redirects back to payment.html

**Note**: The system prevents confirmation access until payment is completed, ensuring the payment step is always enforced between booking and confirmation.

### Pricing Rule

Ticket price for every show must be less than ₹50.

### Payment QR

- Uploaded QR image is shown first on `payment.html`.
- If uploaded QR is missing, dynamic QR is generated with exact booking amount.
- Place your QR image at:
	`frontend/assets/qr.jpeg`
- Payee details for dynamic QR are configured in `frontend/script.js` under `PAYMENT_CONFIG`.

### Admin Authorization Note

Admin-only endpoints require:

`Authorization: Bearer <jwt_token>`

To test admin actions quickly, update a user's role to `admin` in MongoDB (for example, in MongoDB Compass).

## Setup & Run

### 1) Install dependencies

```bash
npm install
```

### 2) Start MongoDB

Make sure MongoDB is running locally at:

`mongodb://127.0.0.1:27017/movie_booking_system`

If you want another URI, set environment variable:

```bash
set MONGO_URI=your_mongodb_connection_string
```

### 3) Seed sample data (optional but recommended)

```bash
npm run seed
```

### 4) Run server

```bash
npm run dev
```

Server runs at:

`http://localhost:5000`

### 5) Open frontend

Open these files in browser:

- `frontend/index.html`
- `frontend/movies.html`
- `frontend/booking.html`
- `frontend/payment.html`
- `frontend/confirmation.html`
- `frontend/login.html`
- `frontend/register.html`

Tip: You can use VS Code Live Server extension for easier frontend browsing.
