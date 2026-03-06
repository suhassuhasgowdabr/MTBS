const API_BASE_URL = "http://localhost:5000";
const AUTH_STORAGE_KEY = "movieBookingAuth";
const PAYMENT_CONFIG = {
  payeeName: "Suhas Gowda",
  payeeUpiId: "8073800496@ybl",
};

let allMoviesCache = [];
let currentMovieDetails = null;
let selectedSeats = [];

function getAuthData() {
  try {
    const value = localStorage.getItem(AUTH_STORAGE_KEY);
    return value ? JSON.parse(value) : null;
  } catch (_error) {
    return null;
  }
}

function setAuthData(data) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data));
}

function clearAuthData() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

function updateAuthLinks() {
  const authData = getAuthData();
  const loginLinks = document.querySelectorAll(
    'a[href="login.html"], a[href="user-login.html"], a[href="admin-login.html"]'
  );
  const registerLinks = document.querySelectorAll('a[href="register.html"]');

  if (!authData?.user) {
    loginLinks.forEach((link) => (link.style.display = ""));
    registerLinks.forEach((link) => (link.style.display = ""));
    return;
  }

  loginLinks.forEach((link) => (link.style.display = "none"));
  registerLinks.forEach((link) => (link.style.display = "none"));

  document.querySelectorAll(".logout-link").forEach((element) => element.remove());

  const navTargets = document.querySelectorAll(".navbar .navbar-nav");
  navTargets.forEach((nav) => {
    const userItem = document.createElement("span");
    userItem.className = "nav-link text-white logout-link";
    userItem.textContent = authData.user.name;

    const logoutButton = document.createElement("button");
    logoutButton.type = "button";
    logoutButton.className = "btn btn-sm btn-outline-light ms-2 logout-link";
    logoutButton.textContent = "Logout";
    logoutButton.addEventListener("click", () => {
      clearAuthData();
      window.location.href = "login.html";
    });

    nav.appendChild(userItem);
    nav.appendChild(logoutButton);
  });
}

function getAuthHeaders() {
  const authData = getAuthData();
  if (!authData?.token) {
    return { "Content-Type": "application/json" };
  }

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${authData.token}`,
  };
}

function showAlert(containerId, type, message) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
}

function formatDateTime(value) {
  return new Date(value).toLocaleString();
}

async function fetchMovies() {
  const response = await fetch(`${API_BASE_URL}/movies`);
  if (!response.ok) throw new Error("Failed to fetch movies");
  return response.json();
}

function getQueryParam(key) {
  const params = new URLSearchParams(window.location.search);
  return params.get(key);
}

function renderMoviesList(movies) {
  const list = document.getElementById("moviesList");
  if (!list) return;

  if (!movies.length) {
    list.innerHTML = `<p class="text-muted">No movies available right now.</p>`;
    return;
  }

  list.innerHTML = movies
    .map((movie) => {
      const poster = movie.posterUrl || "https://via.placeholder.com/300x450?text=Movie+Poster";
      const showCount = movie.shows ? movie.shows.length : 0;
      return `
        <div class="col-md-6 col-lg-4">
          <div class="card movie-card h-100">
            <img src="${poster}" class="card-img-top" alt="${movie.title}" />
            <div class="card-body d-flex flex-column">
              <h5 class="card-title">${movie.title}</h5>
              <p class="card-text mb-1"><strong>Genre:</strong> ${movie.genre}</p>
              <p class="card-text mb-1"><strong>Duration:</strong> ${movie.duration} min</p>
              <p class="card-text mb-2"><strong>Shows:</strong> ${showCount}</p>
              <p class="card-text text-muted small flex-grow-1">${movie.description || "No description"}</p>
              <a class="btn btn-primary mt-2" href="booking.html?movieId=${movie._id}">Book Now</a>
            </div>
          </div>
        </div>
      `;
    })
    .join("");
}

function fillMovieSelect(selectElement, movies, placeholder = "Select movie") {
  if (!selectElement) return;
  selectElement.innerHTML = `<option value="">${placeholder}</option>${movies
    .map((movie) => `<option value="${movie._id}">${movie.title}</option>`)
    .join("")}`;
}

async function initMoviesPage() {
  const moviesListElement = document.getElementById("moviesList");
  if (!moviesListElement) return;

  const authData = getAuthData();
  const isAdmin = authData?.user?.role === "admin";
  const adminSection = document.getElementById("adminSection");
  const adminInfo = document.getElementById("adminInfo");

  if (adminSection) {
    adminSection.classList.toggle("d-none", !isAdmin);
  }
  if (adminInfo) {
    adminInfo.classList.toggle("d-none", isAdmin);
  }

  try {
    const movies = await fetchMovies();
    allMoviesCache = movies;
    renderMoviesList(movies);

    if (isAdmin) {
      fillMovieSelect(document.getElementById("adminMovieSelect"), movies, "Select movie for show timing");
      await loadBookingsTable();
    }
  } catch (error) {
    showAlert("adminAlert", "danger", error.message);
  }

  if (!isAdmin) {
    return;
  }

  const addMovieForm = document.getElementById("addMovieForm");
  if (addMovieForm && addMovieForm.dataset.bound !== "true") {
    addMovieForm.dataset.bound = "true";
    addMovieForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(addMovieForm);
      const payload = Object.fromEntries(formData.entries());
      payload.duration = Number(payload.duration);

      try {
        const response = await fetch(`${API_BASE_URL}/movies`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Failed to add movie");

        addMovieForm.reset();
        showAlert("adminAlert", "success", "Movie added successfully.");
        await initMoviesPage();
      } catch (error) {
        showAlert("adminAlert", "danger", error.message);
      }
    });
  }

  const addShowForm = document.getElementById("addShowForm");
  if (addShowForm && addShowForm.dataset.bound !== "true") {
    addShowForm.dataset.bound = "true";
    addShowForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const movieId = document.getElementById("adminMovieSelect").value;
      if (!movieId) {
        showAlert("adminAlert", "warning", "Please select a movie first.");
        return;
      }

      const formData = new FormData(addShowForm);
      const payload = Object.fromEntries(formData.entries());
      payload.totalSeats = Number(payload.totalSeats);
      payload.price = Number(payload.price);

      if (!Number.isFinite(payload.price) || payload.price <= 0 || payload.price >= 50) {
        showAlert("adminAlert", "warning", "Ticket price must be greater than 0 and less than ₹50.");
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/movies/${movieId}/shows`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Failed to add show");

        addShowForm.reset();
        showAlert("adminAlert", "success", "Show timing added successfully.");
        await initMoviesPage();
      } catch (error) {
        showAlert("adminAlert", "danger", error.message);
      }
    });
  }
}

async function loadBookingsTable(preloadedBookings = null) {
  const tableBody = document.getElementById("bookingsTableBody");
  if (!tableBody) return;

  try {
    let bookings = preloadedBookings;

    if (!bookings) {
      const response = await fetch(`${API_BASE_URL}/bookings`, {
        headers: getAuthHeaders(),
      });
      bookings = await response.json();

      if (!response.ok) {
        throw new Error(bookings.message || "Failed to fetch bookings");
      }
    }

    if (!bookings.length) {
      tableBody.innerHTML = `<tr><td colspan="7" class="text-muted">No bookings yet.</td></tr>`;
      return;
    }

    tableBody.innerHTML = bookings
      .map(
        (booking) => `
      <tr>
        <td>${booking.customerName}<br/><small>${booking.customerEmail}</small></td>
        <td>${booking.movie?.title || "-"}</td>
        <td>${booking.show?.theater || "-"}</td>
        <td>${booking.show?.showTime ? formatDateTime(booking.show.showTime) : "-"}</td>
        <td>${booking.seatsBooked.join(", ")}</td>
        <td>₹${booking.totalAmount}</td>
        <td>${booking.utrNumber || "-"}</td>
      </tr>
    `
      )
      .join("");
  } catch (error) {
    tableBody.innerHTML = `<tr><td colspan="7" class="text-danger">${error.message}</td></tr>`;
  }
}

function renderAdminStats(movies, bookings) {
  const moviesCount = movies.length;
  const showsCount = movies.reduce((sum, movie) => sum + (movie.shows?.length || 0), 0);
  const bookingsCount = bookings.length;
  const totalRevenue = bookings.reduce((sum, booking) => sum + Number(booking.totalAmount || 0), 0);

  const moviesStat = document.getElementById("adminStatsMovies");
  const showsStat = document.getElementById("adminStatsShows");
  const bookingsStat = document.getElementById("adminStatsBookings");
  const revenueStat = document.getElementById("adminStatsRevenue");

  if (moviesStat) moviesStat.textContent = String(moviesCount);
  if (showsStat) showsStat.textContent = String(showsCount);
  if (bookingsStat) bookingsStat.textContent = String(bookingsCount);
  if (revenueStat) revenueStat.textContent = `₹${totalRevenue}`;
}

async function refreshAdminPanelData() {
  const movies = await fetchMovies();
  allMoviesCache = movies;
  renderMoviesList(movies);
  fillMovieSelect(document.getElementById("adminMovieSelect"), movies, "Select movie for show timing");

  const response = await fetch(`${API_BASE_URL}/bookings`, {
    headers: getAuthHeaders(),
  });
  const bookings = await response.json();
  if (!response.ok) {
    throw new Error(bookings.message || "Failed to fetch bookings");
  }

  await loadBookingsTable(bookings);
  renderAdminStats(movies, bookings);
}

async function initAdminPanelPage() {
  const root = document.getElementById("adminDashboardRoot");
  if (!root) return;

  const authData = getAuthData();
  const isAdmin = authData?.user?.role === "admin";
  const content = document.getElementById("adminPanelContent");
  const denied = document.getElementById("adminAccessDenied");

  if (!isAdmin) {
    if (content) content.classList.add("d-none");
    if (denied) denied.classList.remove("d-none");
    return;
  }

  if (content) content.classList.remove("d-none");
  if (denied) denied.classList.add("d-none");

  try {
    await refreshAdminPanelData();
    await initMoviesPage();
  } catch (error) {
    showAlert("adminAlert", "danger", error.message);
  }

  const refreshBtn = document.getElementById("adminRefreshBtn");
  if (refreshBtn && refreshBtn.dataset.bound !== "true") {
    refreshBtn.dataset.bound = "true";
    refreshBtn.addEventListener("click", async () => {
      refreshBtn.disabled = true;
      refreshBtn.textContent = "Refreshing...";
      try {
        await refreshAdminPanelData();
      } catch (error) {
        showAlert("adminAlert", "danger", error.message);
      } finally {
        refreshBtn.disabled = false;
        refreshBtn.textContent = "Refresh Dashboard";
      }
    });
  }
}

async function initBookingPage() {
  const bookingForm = document.getElementById("bookingForm");
  if (!bookingForm) return;

  const movieSelect = document.getElementById("bookingMovieSelect");
  const showSelect = document.getElementById("bookingShowSelect");
  const seatCountInput = document.getElementById("seatCountInput");
  const authData = getAuthData();

  if (authData?.user) {
    const nameInput = bookingForm.querySelector('input[name="customerName"]');
    const emailInput = bookingForm.querySelector('input[name="customerEmail"]');
    if (nameInput) nameInput.value = authData.user.name;
    if (emailInput) emailInput.value = authData.user.email;
  }

  try {
    const movies = await fetchMovies();
    allMoviesCache = movies;

    fillMovieSelect(movieSelect, movies, "Select movie");

    const preselectedMovieId = getQueryParam("movieId");
    if (preselectedMovieId) {
      movieSelect.value = preselectedMovieId;
    }

    await loadShowsForSelectedMovie();
  } catch (error) {
    showAlert("bookingAlert", "danger", error.message);
  }

  movieSelect.addEventListener("change", loadShowsForSelectedMovie);
  showSelect.addEventListener("change", renderSeatGridForCurrentShow);
  seatCountInput.addEventListener("input", onSeatCountChange);

  bookingForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const selectedMovieId = movieSelect.value;
    const selectedShowId = showSelect.value;
    const seatCount = Number(seatCountInput.value);

    if (!selectedMovieId || !selectedShowId) {
      showAlert("bookingAlert", "warning", "Please select movie and show timing.");
      return;
    }

    if (selectedSeats.length !== seatCount) {
      showAlert("bookingAlert", "warning", "Please select seats equal to seat count.");
      return;
    }

    const formData = new FormData(bookingForm);

    const payload = {
      movieId: selectedMovieId,
      showId: selectedShowId,
      customerName: formData.get("customerName"),
      customerEmail: formData.get("customerEmail"),
      seatCount,
      selectedSeats,
      userId: authData?.user?.id,
    };

    try {
      const response = await fetch(`${API_BASE_URL}/book-ticket`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Booking failed");

      const bookingId = result.booking._id;
      const accessCode = result.booking.accessCode;
      const accessCodePart = accessCode ? `&accessCode=${encodeURIComponent(accessCode)}` : "";
      window.location.href = `payment.html?bookingId=${bookingId}${accessCodePart}`;
    } catch (error) {
      showAlert("bookingAlert", "danger", error.message);
    }
  });
}

function buildUpiPayload(booking) {
  const amount = Number(booking.totalAmount || 0).toFixed(2);
  const params = new URLSearchParams({
    pa: PAYMENT_CONFIG.payeeUpiId,
    pn: PAYMENT_CONFIG.payeeName,
    am: amount,
    cu: "INR",
    tn: `Movie ${booking._id}`,
    tr: booking._id,
  });

  return `upi://pay?${params.toString()}`;
}

function buildBookingFetchConfig(accessCode, authData) {
  const headers = authData?.token ? { Authorization: `Bearer ${authData.token}` } : undefined;
  return {
    headers,
    urlSuffix: accessCode ? `?accessCode=${encodeURIComponent(accessCode)}` : "",
  };
}

async function initPaymentPage() {
  const detailsContainer = document.getElementById("paymentBookingDetails");
  if (!detailsContainer) return;

  const bookingId = getQueryParam("bookingId");
  const accessCode = getQueryParam("accessCode");
  const authData = getAuthData();

  if (!bookingId) {
    showAlert("paymentAlert", "danger", "Missing booking ID.");
    return;
  }

  try {
    const fetchConfig = buildBookingFetchConfig(accessCode, authData);
    const response = await fetch(`${API_BASE_URL}/bookings/${bookingId}${fetchConfig.urlSuffix}`, {
      headers: fetchConfig.headers,
    });
    const booking = await response.json();

    if (!response.ok) throw new Error(booking.message || "Failed to load booking");

    detailsContainer.innerHTML = `
      <h5 class="card-title">Booking Summary</h5>
      <p class="mb-1"><strong>Booking ID:</strong> ${booking._id}</p>
      <p class="mb-1"><strong>Movie:</strong> ${booking.movie?.title || "-"}</p>
      <p class="mb-1"><strong>Theater:</strong> ${booking.show?.theater || "-"}</p>
      <p class="mb-1"><strong>Seats:</strong> ${booking.seatsBooked.join(", ")}</p>
      <p class="mb-1"><strong>Amount:</strong> ₹${booking.totalAmount}</p>
      <p class="mb-0"><strong>Payment Status:</strong> ${booking.paymentStatus || "pending"}</p>
    `;

    // Use dynamic QR code generated from configured UPI details
    const staticQrImage = document.getElementById("providedQrImage");
    const upiText = document.getElementById("upiText");
    const qrLoadingPlaceholder = document.getElementById("qrLoadingPlaceholder");
    const upiPayload = buildUpiPayload(booking);
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(upiPayload)}`;

    if (qrLoadingPlaceholder) {
      qrLoadingPlaceholder.style.display = "flex";
      qrLoadingPlaceholder.innerHTML = "<div>Loading QR...</div>";
    }

    // Display dynamic QR code
    if (staticQrImage) {
      staticQrImage.src = qrUrl;
      staticQrImage.style.display = "none";
      staticQrImage.classList.remove("d-none");
      staticQrImage.onload = () => {
        staticQrImage.style.display = "block";
        if (qrLoadingPlaceholder) {
          qrLoadingPlaceholder.style.display = "none";
        }
      };
      staticQrImage.onerror = () => {
        if (qrLoadingPlaceholder) {
          qrLoadingPlaceholder.style.display = "flex";
          qrLoadingPlaceholder.innerHTML = '<div class="text-danger">QR Code failed to load</div>';
        }
      };
    }

    // Display payment info
    if (upiText) {
      upiText.textContent = `Scan QR code to pay ₹${booking.totalAmount} to ${PAYMENT_CONFIG.payeeName}`;
    }

    const markPaidBtn = document.getElementById("markPaidBtn");
    if (markPaidBtn) {
      markPaidBtn.addEventListener("click", async () => {
        const utrInput = document.getElementById("utrNumber");
        const utrNumber = utrInput ? String(utrInput.value || "").trim() : "";
        if (!utrNumber) {
          showAlert("paymentAlert", "warning", "Please enter UTR/Transaction ID");
          return;
        }

        markPaidBtn.disabled = true;
        markPaidBtn.textContent = "Processing...";

        try {
          const payResponse = await fetch(`${API_BASE_URL}/bookings/${bookingId}/pay`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({ accessCode, utrNumber }),
          });
          const payResult = await payResponse.json();
          if (!payResponse.ok) throw new Error(payResult.message || "Payment confirmation failed");

          const accessCodePart = accessCode ? `&accessCode=${encodeURIComponent(accessCode)}` : "";
          window.location.href = `confirmation.html?bookingId=${bookingId}${accessCodePart}`;
        } catch (error) {
          showAlert("paymentAlert", "danger", error.message);
          markPaidBtn.disabled = false;
          markPaidBtn.textContent = "I Have Paid";
        }
      });
    }
  } catch (error) {
    showAlert("paymentAlert", "danger", error.message);
  }
}

async function loadShowsForSelectedMovie() {
  const movieSelect = document.getElementById("bookingMovieSelect");
  const showSelect = document.getElementById("bookingShowSelect");
  if (!movieSelect || !showSelect) return;

  const movieId = movieSelect.value;
  if (!movieId) {
    showSelect.innerHTML = `<option value="">Select show timing</option>`;
    currentMovieDetails = null;
    selectedSeats = [];
    renderSeatGrid([]);
    updateSelectedSeatsText();
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/movies/${movieId}`);
    const movieDetails = await response.json();
    if (!response.ok) throw new Error(movieDetails.message || "Failed to fetch movie details");

    currentMovieDetails = movieDetails;

    if (!movieDetails.shows.length) {
      showSelect.innerHTML = `<option value="">No show timings available</option>`;
      selectedSeats = [];
      renderSeatGrid([]);
      updateSelectedSeatsText();
      return;
    }

    showSelect.innerHTML = movieDetails.shows
      .map(
        (show, index) =>
          `<option value="${show._id}" ${index === 0 ? "selected" : ""}>
            ${formatDateTime(show.showTime)} | ${show.theater} | ₹${show.price} | ${show.availableSeats} seats left
          </option>`
      )
      .join("");

    renderSeatGridForCurrentShow();
  } catch (error) {
    showAlert("bookingAlert", "danger", error.message);
  }
}

function getCurrentSelectedShow() {
  const showSelect = document.getElementById("bookingShowSelect");
  if (!currentMovieDetails || !showSelect) return null;
  return currentMovieDetails.shows.find((show) => show._id === showSelect.value) || null;
}

function renderSeatGridForCurrentShow() {
  const show = getCurrentSelectedShow();
  selectedSeats = [];

  if (!show) {
    renderSeatGrid([]);
    updateSelectedSeatsText();
    return;
  }

  const bookedSeats = Array.isArray(show.bookedSeats) ? show.bookedSeats : [];
  const seats = Array.from({ length: show.totalSeats }, (_, index) => ({
    seatNumber: index + 1,
    isBooked: bookedSeats.includes(index + 1),
  }));

  renderSeatGrid(seats);
  updateSelectedSeatsText();
}

function onSeatCountChange() {
  const seatCountInput = document.getElementById("seatCountInput");
  const seatCount = Number(seatCountInput.value) || 1;
  if (selectedSeats.length > seatCount) {
    selectedSeats = selectedSeats.slice(0, seatCount);
  }
  reapplySelectedSeatsUI();
  updateSelectedSeatsText();
}

function renderSeatGrid(seats) {
  const grid = document.getElementById("seatGrid");
  if (!grid) return;

  if (!seats.length) {
    grid.innerHTML = `<p class="text-muted">Choose a movie and show timing to view seats.</p>`;
    return;
  }

  grid.innerHTML = seats
    .map((seat) => {
      const disabled = seat.isBooked ? "disabled" : "";
      const bookedClass = seat.isBooked ? "booked" : "";
      return `<button type="button" class="seat-btn ${bookedClass}" data-seat="${seat.seatNumber}" ${disabled}>${seat.seatNumber}</button>`;
    })
    .join("");

  grid.querySelectorAll(".seat-btn:not(.booked)").forEach((button) => {
    button.addEventListener("click", () => {
      const seatNumber = Number(button.dataset.seat);
      toggleSeatSelection(seatNumber);
    });
  });

  reapplySelectedSeatsUI();
}

function toggleSeatSelection(seatNumber) {
  const seatCount = Number(document.getElementById("seatCountInput")?.value || 1);
  const isSelected = selectedSeats.includes(seatNumber);

  if (isSelected) {
    selectedSeats = selectedSeats.filter((seat) => seat !== seatNumber);
  } else {
    if (selectedSeats.length >= seatCount) {
      showAlert(
        "bookingAlert",
        "warning",
        `You can select only ${seatCount} seat(s). Increase seat count to choose more.`
      );
      return;
    }
    selectedSeats.push(seatNumber);
    selectedSeats.sort((a, b) => a - b);
  }

  reapplySelectedSeatsUI();
  updateSelectedSeatsText();
}

function reapplySelectedSeatsUI() {
  document.querySelectorAll(".seat-btn").forEach((button) => {
    const seatNumber = Number(button.dataset.seat);
    if (selectedSeats.includes(seatNumber)) {
      button.classList.add("selected");
    } else {
      button.classList.remove("selected");
    }
  });
}

function updateSelectedSeatsText() {
  const element = document.getElementById("selectedSeatsText");
  if (!element) return;
  element.textContent = selectedSeats.length ? selectedSeats.join(", ") : "None";
}

async function initConfirmationPage() {
  const container = document.getElementById("confirmationContent");
  if (!container) return;

  const bookingId = getQueryParam("bookingId");
  const accessCode = getQueryParam("accessCode");
  const authData = getAuthData();
  if (!bookingId) {
    container.innerHTML = `<h3 class="text-danger">Booking Not Found</h3><p>No booking ID provided.</p>`;
    return;
  }

  try {
    const fetchConfig = buildBookingFetchConfig(accessCode, authData);
    const response = await fetch(`${API_BASE_URL}/bookings/${bookingId}${fetchConfig.urlSuffix}`, {
      headers: fetchConfig.headers,
    });
    const booking = await response.json();

    if (!response.ok) throw new Error(booking.message || "Failed to fetch booking");

    if (booking.paymentStatus !== "paid") {
      container.innerHTML = `
        <h3 class="text-warning">Payment Pending</h3>
        <p class="mb-3">Please complete payment before viewing confirmation.</p>
        <a href="payment.html?bookingId=${bookingId}${
          accessCode ? `&accessCode=${encodeURIComponent(accessCode)}` : ""
        }" class="btn btn-primary">Go to Payment</a>
      `;
      return;
    }

    container.innerHTML = `
      <h3 class="text-success">Booking Confirmed</h3>
      <p class="mb-1"><strong>Booking ID:</strong> ${booking._id}</p>
      <p class="mb-1"><strong>Name:</strong> ${booking.customerName}</p>
      <p class="mb-1"><strong>Email:</strong> ${booking.customerEmail}</p>
      <p class="mb-1"><strong>Movie:</strong> ${booking.movie?.title || "-"}</p>
      <p class="mb-1"><strong>Theater:</strong> ${booking.show?.theater || "-"}</p>
      <p class="mb-1"><strong>Show Time:</strong> ${booking.show?.showTime ? formatDateTime(booking.show.showTime) : "-"}</p>
      <p class="mb-1"><strong>Seats:</strong> ${booking.seatsBooked.join(", ")}</p>
      <p class="mb-1"><strong>Total Amount:</strong> ₹${booking.totalAmount}</p>
      ${booking.utrNumber ? `<p class="mb-1"><strong>UTR Number:</strong> ${booking.utrNumber}</p>` : ""}
      <p class="mb-0"><strong>Payment:</strong> Paid</p>
    `;
  } catch (error) {
    container.innerHTML = `<h3 class="text-danger">Failed to load confirmation</h3><p>${error.message}</p>`;
  }
}

async function initRegisterPage() {
  const form = document.getElementById("registerForm");
  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(form);

    const payload = {
      name: formData.get("name"),
      email: formData.get("email"),
      password: formData.get("password"),
    };

    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Registration failed");

      setAuthData({ token: result.token, user: result.user });
      showAlert("registerAlert", "success", "Registration successful. Redirecting to booking...");
      setTimeout(() => {
        window.location.href = "booking.html";
      }, 800);
    } catch (error) {
      showAlert("registerAlert", "danger", error.message);
    }
  });
}

async function initLoginPage() {
  const form = document.getElementById("loginForm");
  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(form);

    const payload = {
      email: formData.get("email"),
      password: formData.get("password"),
    };

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Login failed");

      setAuthData({ token: result.token, user: result.user });
      showAlert("loginAlert", "success", "Login successful. Redirecting to booking...");
      setTimeout(() => {
        window.location.href = "booking.html";
      }, 800);
    } catch (error) {
      showAlert("loginAlert", "danger", error.message);
    }
  });
}

async function handleRoleLogin(formId, alertId, requiredRole, successRedirect) {
  const form = document.getElementById(formId);
  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(form);

    const payload = {
      email: formData.get("email"),
      password: formData.get("password"),
    };

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Login failed");

      if (requiredRole === "admin" && result.user?.role !== "admin") {
        throw new Error("This account is not an admin account.");
      }

      if (requiredRole === "user" && result.user?.role === "admin") {
        throw new Error("Please use Admin Login for admin accounts.");
      }

      setAuthData({ token: result.token, user: result.user });
      showAlert(alertId, "success", "Login successful. Redirecting...");
      setTimeout(() => {
        window.location.href = successRedirect;
      }, 800);
    } catch (error) {
      showAlert(alertId, "danger", error.message);
    }
  });
}

async function initUserLoginPage() {
  await handleRoleLogin("userLoginForm", "userLoginAlert", "user", "booking.html");
}

async function initAdminLoginPage() {
  await handleRoleLogin("adminLoginForm", "adminLoginAlert", "admin", "admin-panel.html");
}

async function initHomePage() {
  const totalMoviesEl = document.getElementById("totalMovies");
  const totalShowsEl = document.getElementById("totalShows");
  const totalBookingsEl = document.getElementById("totalBookings");
  const totalRevenueEl = document.getElementById("totalRevenue");

  // Only run if we're on the home page
  if (!totalMoviesEl) return;

  try {
    // Fetch movies to get movie and show counts
    const moviesResponse = await fetch(`${API_BASE_URL}/movies`);
    const movies = await moviesResponse.json();
    
    let showCount = 0;
    movies.forEach(movie => {
      if (movie.shows && Array.isArray(movie.shows)) {
        showCount += movie.shows.length;
      }
    });

    // Try to fetch bookings if admin is logged in
    const authData = getAuthData();
    let bookings = [];
    
    if (authData?.token && authData?.user?.role === 'admin') {
      try {
        const bookingsResponse = await fetch(`${API_BASE_URL}/bookings`, {
          headers: { Authorization: `Bearer ${authData.token}` }
        });
        if (bookingsResponse.ok) {
          bookings = await bookingsResponse.json();
        }
      } catch (err) {
        // If bookings fetch fails, just use empty array
        console.log('Could not fetch bookings:', err.message);
      }
    }

    const totalRevenue = bookings.reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0);

    // Update the stats
    if (totalMoviesEl) totalMoviesEl.textContent = movies.length;
    if (totalShowsEl) totalShowsEl.textContent = showCount;
    if (totalBookingsEl) totalBookingsEl.textContent = bookings.length || '0';
    if (totalRevenueEl) totalRevenueEl.textContent = bookings.length > 0 ? `₹${totalRevenue.toFixed(2)}` : '₹0';

  } catch (error) {
    console.error('Error loading home page stats:', error);
    // Show placeholder values on error
    if (totalMoviesEl) totalMoviesEl.textContent = '0';
    if (totalShowsEl) totalShowsEl.textContent = '0';
    if (totalBookingsEl) totalBookingsEl.textContent = '0';
    if (totalRevenueEl) totalRevenueEl.textContent = '₹0';
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  updateAuthLinks();
  await initHomePage();
  await initRegisterPage();
  await initLoginPage();
  await initUserLoginPage();
  await initAdminLoginPage();
  await initMoviesPage();
  await initAdminPanelPage();
  await initBookingPage();
  await initPaymentPage();
  await initConfirmationPage();
});
