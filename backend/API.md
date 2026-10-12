# HostelHub Backend API

Base: `http://localhost:5000/api`

## Auth
- POST `/auth/register`
- POST `/auth/login`

## Public
- GET `/hostels`
- GET `/hostels/:id`
- GET `/rooms/hostel/:hostelId`
- GET `/menu/hostel/:hostelId`
- GET `/updates/hostel/:hostelId`

## Owner
All require `Authorization: Bearer <JWT>`.
- POST `/hostels`
- PUT `/hostels/:id`
- POST `/hostels/:id/photos`
- DELETE `/hostels/:id/photos/:photoId`
- POST `/rooms/hostel/:hostelId`
- PUT `/rooms/:id`
- POST `/menu/hostel/:hostelId`
- DELETE `/menu/:id`
- POST `/updates/hostel/:hostelId`

### Photo upload
Use `multipart/form-data` with field name **photos**.
- Up to 10 images/request
- JPG, PNG, WEBP
- 5 MB/image
- Files are stored in `uploads/hostels`

Example:
`curl -X POST http://localhost:5000/api/hostels/1/photos -H "Authorization: Bearer TOKEN" -F "photos=@room.jpg"`

## User
- POST `/bookings`
- GET `/bookings/mine`
- GET `/payments/mine`
- POST `/payments/monthly-fee`
- POST `/reviews`
- GET `/wishlist`
- POST `/wishlist/:hostelId`
- DELETE `/wishlist/:hostelId`

The booking/payment implementation currently uses demo payment records. A real Razorpay/Stripe integration should be connected after the booking flow is tested.
