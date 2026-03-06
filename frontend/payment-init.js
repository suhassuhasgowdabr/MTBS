// Enhanced Payment Page Handler - Global
if (document.getElementById('paymentBookingDetails')) {
  console.log('Payment page detected, initializing...');
  
  // Add custom initialization for payment page
  const paymentInit = async () => {
    console.log('Running payment initialization...');
    
    const paymentLoading = document.getElementById('paymentLoading');
    const paymentContent = document.getElementById('paymentContent');
    const detailsContainer = document.getElementById('paymentBookingDetails');
    const bookingId = getQueryParam('bookingId');
    const accessCode = getQueryParam('accessCode');
    
    console.log('Booking ID:', bookingId);
    console.log('Access Code:', accessCode);
    
    if (!bookingId) {
      showAlert('paymentAlert', 'danger', 'Missing booking ID. Please book from the booking page.');
      if (paymentLoading) paymentLoading.style.display = 'none';
      return;
    }
    
    try {
      const authData = getAuthData();
      const fetchConfig = buildBookingFetchConfig(accessCode, authData);
      console.log('Fetching booking details...');
      
      const response = await fetch(`${ API_BASE_URL}/bookings/${ bookingId}${ fetchConfig.urlSuffix}`, {
        headers: fetchConfig.headers,
      });
      
      const booking = await response.json();
      console.log('Booking response:', booking);
      
      if (!response.ok) throw new Error(booking.message || 'Failed to load booking');
      
      // Show payment content
      if (paymentLoading) paymentLoading.style.display = 'none';
      if (paymentContent) paymentContent.style.display = 'flex';
      
      // Fill booking details
      detailsContainer.innerHTML = `
        <h5 class="card-title">Booking Summary</h5>
        <p class="mb-1"><strong>Booking ID:</strong> ${ booking._id}</p>
        <p class="mb-1"><strong>Movie:</strong> ${ booking.movie?.title || '-'}</p>
        <p class="mb-1"><strong>Theater:</strong> ${ booking.show?.theater || '-'}</p>
        <p class="mb-1"><strong>Seats:</strong> ${ booking.seatsBooked.join(', ')}</p>
        <p class="mb-1"><strong>Amount:</strong> ?${ booking.totalAmount}</p>
        <p class="mb-0"><strong>Payment Status:</strong> ${ booking.paymentStatus || 'pending'}</p>
      `;
      
      // Setup QR codes
      const upiPayload = buildUpiPayload(booking);
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${ encodeURIComponent(upiPayload)}`;
      
      const providedQrImage = document.getElementById('providedQrImage');
      const dynamicQrImage = document.getElementById('dynamicQrImage');
      const qrLoadingPlaceholder = document.getElementById('qrLoadingPlaceholder');
      const upiText = document.getElementById('upiText');
      const markPaidBtn = document.getElementById('markPaidBtn');
      
      // Try provided QR first
      if (providedQrImage) {
        providedQrImage.onload = () => {
          console.log('Provided QR loaded');
          providedQrImage.style.display = 'block';
          if (dynamicQrImage) dynamicQrImage.style.display = 'none';
          if (qrLoadingPlaceholder) qrLoadingPlaceholder.style.display = 'none';
          if (upiText) upiText.textContent = 'Using uploaded QR Code';
        };
        providedQrImage.onerror = () => {
          console.log('Provided QR not found, using dynamic QR');
          providedQrImage.style.display = 'none';
          if (dynamicQrImage) dynamicQrImage.style.display = 'block';
          if (qrLoadingPlaceholder) qrLoadingPlaceholder.style.display = 'none';
        };
      }
      
      // Load dynamic QR
      if (dynamicQrImage) {
        console.log('Loading dynamic QR from:', qrUrl);
        dynamicQrImage.src = qrUrl;
        dynamicQrImage.onload = () => {
          console.log('Dynamic QR loaded');
          if (qrLoadingPlaceholder) qrLoadingPlaceholder.style.display = 'none';
          if (!providedQrImage || providedQrImage.style.display === 'none') {
            dynamicQrImage.style.display = 'block';
          }
        };
        dynamicQrImage.onerror = () => {
          console.log('Dynamic QR failed to load');
          if (qrLoadingPlaceholder) qrLoadingPlaceholder.textContent = 'QR Code failed to load';
        };
      }
      
      // Enable pay button
      if (markPaidBtn) {
        markPaidBtn.disabled = false;
        markPaidBtn.addEventListener('click', async () => {
          const utrInput = document.getElementById('utrNumber');
          const utrNumber = utrInput ? utrInput.value.trim() : '';
          
          if (!utrNumber) {
            showAlert('paymentAlert', 'warning', 'Please enter the UTR/Transaction ID');
            return;
          }
          
          markPaidBtn.disabled = true;
          markPaidBtn.textContent = 'Processing...';
          
          try {
            const payResponse = await fetch(`${ API_BASE_URL}/bookings/${ bookingId}/pay`, {
              method: 'POST',
              headers: getAuthHeaders(),
              body: JSON.stringify({ accessCode, utrNumber }),
            });
            const payResult = await payResponse.json();
            if (!payResponse.ok) throw new Error(payResult.message || 'Payment confirmation failed');
            
            const accessCodePart = accessCode ? `&accessCode=${ encodeURIComponent(accessCode)}` : '';
            window.location.href = `confirmation.html?bookingId=${ bookingId}${ accessCodePart}`;
          } catch (error) {
            showAlert('paymentAlert', 'danger', error.message);
            markPaidBtn.disabled = false;
            markPaidBtn.textContent = 'I Have Paid';
          }
        });
      }
      
    } catch (error) {
      console.error('Payment error:', error);
      showAlert('paymentAlert', 'danger', error.message);
      if (paymentLoading) paymentLoading.style.display = 'none';
    }
  };
  
  // Run after DOM is ready and functions are defined
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(paymentInit, 500);
    });
  } else {
    setTimeout(paymentInit, 500);
  }
}
