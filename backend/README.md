# HostelHub Backend

Production-ready Node.js + Express + SQLite backend for the HostelHub student accommodation platform.

## Features & Endpoints

### 1. Authentication & Security (`/api/auth`)
- `POST /register`: Student and owner registration with bcrypt password hashing
- `POST /login`: Validates DB credentials, checks active status, records login event in `login_events`
- `GET /me`: Authenticated profile fetch
- `POST /change-password`: Password update with current password validation
- `DELETE /me`: Secure account deletion
- `GET /users` (Admin): List registered users
- `PATCH /users/:id/status` (Admin): Activate / deactivate user account
- `GET /admin/overview` (Admin): Metrics, pending hostel requests, complaints, audit login trail
- `PATCH /admin/hostels/:id/review` (Admin): Approve / reject hostel listings
- `POST /admin/hostels` (Admin): Add and approve a manual hostel listing with room inventory

### 2. Hostel Listings (`/api/hostels`)
- `GET /`: Search and filter approved hostels by city, keyword, amenities, price
- `GET /:id`: Full hostel details (rooms, photos, menu, announcements, verified reviews)
- `GET /mine` (Owner): Retrieve hostels owned by authenticated owner
- `POST /` (Owner): Create new hostel listing (submitted as pending approval)
- `PUT /:id` (Owner): Update hostel information
- `POST /:id/photos` (Owner): Upload hostel photos (Multer, JPG/PNG/WEBP up to 5MB)
- `DELETE /:id/photos/:photoId` (Owner): Remove hostel photo

### 3. Room Management (`/api/rooms`)
- `GET /hostel/:hostelId`: List rooms and available beds
- `POST /hostel/:hostelId` (Owner): Create room type with bed inventory and monthly rent
- `PUT /:id` (Owner): Update room vacancy and pricing

### 4. Food Menu (`/api/menu`)
- `GET /hostel/:hostelId`: View weekly food schedule
- `PUT /hostel/:hostelId` (Owner): Batch update daily meals for Monday–Sunday
- `POST /hostel/:hostelId` (Owner): Add single meal item
- `DELETE /:id` (Owner): Remove meal item

### 5. Hostel Announcements (`/api/updates`)
- `GET /hostel/:hostelId`: View announcements for a hostel
- `GET /mine` (Resident): Fetch announcements for hostels the resident is staying at
- `POST /hostel/:hostelId` (Owner): Post announcement
- `DELETE /:id` (Owner): Delete announcement

### 6. Bookings & Residents (`/api/bookings`)
- `POST /`: Student books room; atomic bed decrement & payment record
- `GET /mine`: Student booking history
- `GET /owner` (Owner): View student bookings for owner's hostels
- `GET /residents` (Owner): Current resident roster
- `PATCH /:id/status` (Owner): Accept (confirm) or cancel booking (restores bed vacancy)

### 7. Payments (`/api/payments`)
- `GET /mine`: Student payment transaction history
- `GET /owner` (Owner): Revenue and payments received
- `POST /monthly-fee`: Pay monthly hostel rent

### 8. Complaints Support (`/api/complaints`)
- `POST /`: Student files complaint
- `GET /mine`: Student tracks submitted complaints
- `GET /owner` (Owner): Owner views complaints for their hostel
- `GET /all` (Admin): Admin views all platform complaints
- `PATCH /:id/status`: Owner or admin updates complaint status (`open`, `reviewing`, `resolved`, `closed`) and attaches response note

### 9. Listing Reports (`/api/hostel-reports`)
- `POST /`: Students and residents report suspicious, duplicate, misleading, or unsafe listings
- `GET /mine`: Student view of submitted listing reports
- `GET /all` (Admin): Admin moderation queue
- `PATCH /:id/status` (Admin): Mark a report `reviewing`, `resolved`, or `dismissed`

### 10. Reviews & Wishlist (`/api/reviews`, `/api/wishlist`)
- `POST /reviews`: Verified residents review hostel (1–5 stars)
- `GET /reviews/hostel/:id`: Public reviews
- `GET /reviews/owner` (Owner): Reviews received
- `GET /wishlist`: User's saved hostels with photos and prices
- `POST /wishlist/:hostelId`: Save hostel to wishlist
- `DELETE /wishlist/:hostelId`: Remove from wishlist

## Running Locally

```bash
cd backend
npm install
npm test      # Runs 47-point automated verification suite
npm run dev   # Starts backend on http://localhost:5000
```

### Demo administrator credentials

The demo seed creates the administrator account below when the database is initialized:

- Email: `admin@hostelhub.local`
- Password: `Admin@123`

Change this password before using the application with real data.

## Production Deployment Checklist
1. **Environment Variables**:
   - Set `JWT_SECRET` to a high-entropy 256-bit random hex string.
   - Set `PORT` (default: `5000` or provided by host).
   - Set `ALLOWED_ORIGINS` to your frontend production domain (e.g. `https://hostelhub.vercel.app`).
2. **Persistent Storage**:
   - Ensure the SQLite database file (`hostelhub.db`) and `uploads/` directory are mounted on persistent disk storage (or configure S3/Cloudinary for uploads).
