# HostelHub Frontend

Modern React 19 + Vite frontend application for HostelHub.

## Integrated Dashboards & Portals

1. **Student / Resident Dashboard (`/resident`)**
   - Active stay overview: hostel details, monthly rent, move-in date
   - Real-time today's food menu & hostel notices
   - Booking history with status tracking
   - Monthly rent fee payments with instant confirmation
   - Saved wishlist management
   - Student complaint submission and management response tracker
   - Star reviews & feedback submission

2. **Hostel Owner Portal (`/owner`)**
   - Overview metrics: Available beds, active residents, pending bookings
   - Hostel management (`/owner/hostel`): Edit hostel details & full photo upload/delete gallery
   - Room management (`/owner/rooms`): Configure sharing types, prices, and bed capacities
   - Weekly food menu (`/owner/menu`): Edit Monday–Sunday meal schedule
   - Notice board (`/owner/updates`): Post and delete announcements
   - Booking requests: Review student bookings with Accept / Cancel actions
   - Resident roster: Current students living in owner's hostels
   - Complaints response: Address student issues with resolution notes

3. **Platform Administrator Portal (`/admin`)**
   - Live metrics: Total users, students, owners, logins, hostel listings
   - Hostel approval queue: Approve or reject pending hostel applications
   - Complete hostel moderation: Review and change status of any listing
   - Complaints moderation: Track and resolve student complaints with notes
   - User account controls: Activate or deactivate accounts
   - Audit trail: Review recent login events

4. **Public Browsing & Direct Bookings**
   - Filter hostels by location, gender type, rent slider
   - Hostel details page with multi-photo gallery, room choices, amenities, menu, and reviews
   - Real checkout booking flow connected to backend API
   - Wishlist persistence backed by the database

## Development

```bash
cd frontend
npm install
npm run dev     # Starts Vite dev server on http://localhost:5173
```

## Production Build & Deployment

```bash
npm run build   # Produces optimized production bundle in dist/
```

- When deploying to **Vercel**:
  - `vercel.json` is pre-configured with SPA route rewrites to avoid 404s on browser refreshes.
  - Set Environment Variable `VITE_API_BASE_URL` to your production backend API URL (e.g. `https://api.yourdomain.com/api`).
