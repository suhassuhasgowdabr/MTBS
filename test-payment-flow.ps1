# Test Movie Booking Payment Flow

$apiBase = 'http://localhost:5000'
$uiBase = 'http://localhost:5500'

Write-Host "Test: Movie Booking -> Payment -> Confirmation Flow"
Write-Host "=====================================================" 
Write-Host ""

try {
    Write-Host "[1/5] Fetching available movies..."
    $moviesResp = Invoke-WebRequest -Uri "$apiBase/movies" -UseBasicParsing -TimeoutSec 5
    $movies = $moviesResp.Content | ConvertFrom-Json
    
    $movie = $movies[0]
    $movieId = $movie._id
    $movieTitle = $movie.title
    $showId = $movie.shows[0]._id
    $showPrice = $movie.shows[0].price
    
    Write-Host "  OK: Found movie '$movieTitle' (Rs.$showPrice)"
    Write-Host ""
    
    Write-Host "[2/5] Creating booking..."
    $bookingPayload = @{
        movieId = $movieId
        showId = $showId
        customerName = 'Test User'
        customerEmail = "test.$(Get-Random)@example.com"
        seatCount = 2
        selectedSeats = @(5, 6)
    } | ConvertTo-Json
    
    $bookResp = Invoke-WebRequest -Uri "$apiBase/book-ticket" -Method Post `
        -ContentType 'application/json' -Body $bookingPayload -UseBasicParsing -TimeoutSec 5
    $bookData = $bookResp.Content | ConvertFrom-Json
    
    $bookingId = $bookData.booking._id
    $accessCode = $bookData.booking.accessCode
    $initialStatus = $bookData.booking.paymentStatus
    $totalAmount = $bookData.booking.totalAmount
    
    Write-Host "  OK: Booking created"
    Write-Host "       Booking ID: $bookingId"
    Write-Host "       Amount: Rs.$totalAmount"
    Write-Host "       Initial Status: $initialStatus"
    Write-Host ""
    
    Write-Host "[3/5] Verifying booking access..."
    $fetchResp = Invoke-WebRequest -Uri "$apiBase/bookings/$bookingId`?accessCode=$accessCode" `
        -UseBasicParsing -TimeoutSec 5
    $fetchedBooking = $fetchResp.Content | ConvertFrom-Json
    
    Write-Host "  OK: Booking verified (Seats: $($fetchedBooking.seatsBooked -join ', '))"
    Write-Host ""
    
    Write-Host "[4/5] Marking payment as complete..."
    $paymentPayload = @{ accessCode = $accessCode } | ConvertTo-Json
    $payResp = Invoke-WebRequest -Uri "$apiBase/bookings/$bookingId/pay" -Method Post `
        -ContentType 'application/json' -Body $paymentPayload -UseBasicParsing -TimeoutSec 5
    $payResult = $payResp.Content | ConvertFrom-Json
    
    Write-Host "  OK: Payment processed (Status: $($payResult.paymentStatus))"
    Write-Host ""
    
    Write-Host "[5/5] Verifying confirmation status..."
    $confirmResp = Invoke-WebRequest -Uri "$apiBase/bookings/$bookingId`?accessCode=$accessCode" `
        -UseBasicParsing -TimeoutSec 5
    $confirmBooking = $confirmResp.Content | ConvertFrom-Json
    
    if ($confirmBooking.paymentStatus -eq "paid") {
        Write-Host "  OK: Confirmation ready (Status: $($confirmBooking.paymentStatus))" 
    } else {
        throw "Payment status not updated to paid"
    }
    
    Write-Host ""
    Write-Host "===== BOOKING FLOW COMPLETE ====="
    Write-Host ""
    Write-Host "Test URLs to visit:"
    Write-Host "  1. Booking:     $uiBase/booking.html"
    Write-Host "  2. Payment:     $uiBase/payment.html?bookingId=$bookingId&accessCode=$accessCode"
    Write-Host "  3. Confirm:     $uiBase/confirmation.html?bookingId=$bookingId&accessCode=$accessCode"
    Write-Host ""
    Write-Host "Flow should be: Book Ticket -> Payment Page (QR shown) -> Confirm -> Confirmation Page"
    Write-Host ""
    
} catch {
    Write-Host "ERROR: $($_.Exception.Message)"
    exit 1
}
