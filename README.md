# Movie Booking System

Simple full-stack movie ticket booking app built with Node.js, Express, MongoDB, and a static HTML/CSS/JS frontend.

## Tech Stack

- Frontend: HTML, CSS, JavaScript, Bootstrap
- Backend: Node.js, Express.js
- Database: MongoDB

## Features

### User
- Register and login
- Browse movies and shows
- Select seats and create booking
- Pay via QR code
- Enter UTR (transaction reference)
- View booking confirmation after payment

### Admin
- Admin login
- Add movies and shows
- View all bookings
- View UTR numbers in booking table

## API Endpoints

- `GET /movies`
- `GET /movies/:id`
- `POST /movies` (admin)
- `POST /movies/:id/shows` (admin)
- `POST /auth/register`
- `POST /auth/login`
- `POST /book-ticket`
- `GET /bookings` (admin)
- `GET /bookings/:id` (owner/admin/token or accessCode)
- `POST /bookings/:id/pay` (owner/admin/token or accessCode)

## Booking & Payment Flow

1. Select movie, show, and seats from `booking.html`
2. Booking is created with `pending` payment status
3. On `payment.html`, QR is shown with dynamic amount
4. User enters UTR number and clicks **I Have Paid**
5. Booking status becomes `paid` and confirmation opens
6. Admin panel shows UTR in **All Bookings**

## Payment Configuration

Update payee details in `frontend/script.js`:

- `PAYMENT_CONFIG.payeeName`
- `PAYMENT_CONFIG.payeeUpiId`

Current UPI ID configured: `8073800496@ybl`

## Admin Credentials (seeded)

After running seed:

- Email: `admin@admin.com`
- Password: `admin123`

## Setup

### 1) Install dependencies

```bash
npm install
```

### 2) Start MongoDB

Default DB URI:

`mongodb://127.0.0.1:27017/movie_booking_system`

Optional custom URI (Windows PowerShell):

```powershell
$env:MONGO_URI="your_mongodb_connection_string"
```

### 3) Seed sample data + admin

```bash
npm run seed
```

### 4) Start backend

```bash
npm start
```

Backend runs at: `http://localhost:5000`

### 5) Start frontend (recommended)

```bash
npx http-server frontend -p 8080 -o
```

Frontend runs at: `http://localhost:8080`

## Key Pages

- User login: `http://localhost:8080/user-login.html`
- Admin login: `http://localhost:8080/admin-login.html`
- Booking: `http://localhost:8080/booking.html`
- Payment: `http://localhost:8080/payment.html`
- Admin panel: `http://localhost:8080/admin-panel.html`
