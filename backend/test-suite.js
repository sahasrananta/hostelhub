import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import jwt from "jsonwebtoken";
import { initDb, getDb } from "./src/config/db.js";
import auth from "./src/routes/auth.js";
import hostels from "./src/routes/hostels.js";
import rooms from "./src/routes/rooms.js";
import menu from "./src/routes/menu.js";
import updates from "./src/routes/updates.js";
import bookings from "./src/routes/bookings.js";
import payments from "./src/routes/payments.js";
import reviews from "./src/routes/reviews.js";
import wishlist from "./src/routes/wishlist.js";
import complaints from "./src/routes/complaints.js";

const app = express();
const PORT = 5099;
const BASE_URL = `http://localhost:${PORT}/api`;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
app.use("/api/auth", auth);
app.use("/api/hostels", hostels);
app.use("/api/rooms", rooms);
app.use("/api/menu", menu);
app.use("/api/updates", updates);
app.use("/api/bookings", bookings);
app.use("/api/payments", payments);
app.use("/api/reviews", reviews);
app.use("/api/wishlist", wishlist);
app.use("/api/complaints", complaints);

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = { ...(options.headers || {}) };
  if (options.body && typeof options.body === "object" && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(options.body);
  }
  const res = await fetch(url, { ...options, headers });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { status: res.status, ok: res.ok, body: json, raw: text };
}

async function runTests() {
  await initDb();
  const server = app.listen(PORT);
  console.log(`Test server listening on port ${PORT}\n`);

  try {
    console.log("=== 1. Health & Public Check ===");
    const health = await request("/health");
    assert(health.status === 200 && health.body?.status === "ok", "Backend health endpoint returns 200 OK");

    console.log("\n=== 2. Auth: Login & Signup Variations ===");
    // 2a. Invalid password
    const badLogin = await request("/auth/login", {
      method: "POST",
      body: { email: "admin@hostelhub.local", password: "WrongPassword!99" }
    });
    assert(badLogin.status === 401, "Invalid password rejected with 401");

    // 2b. Role mismatch
    const badRole = await request("/auth/login", {
      method: "POST",
      body: { email: "admin@hostelhub.local", password: "Admin@123", role: "owner" }
    });
    assert(badRole.status === 403, "Role mismatch rejected with 403");

    // 2c. Valid admin login
    const adminLogin = await request("/auth/login", {
      method: "POST",
      body: { email: "admin@hostelhub.local", password: "Admin@123", role: "admin" }
    });
    assert(adminLogin.status === 200 && adminLogin.body?.token, "Admin login succeeds with JWT");
    const adminToken = adminLogin.body?.token;

    // 2d. Valid owner login
    const ownerLogin = await request("/auth/login", {
      method: "POST",
      body: { email: "demo-owner@hostelhub.local", password: "DemoOwner@123", role: "owner" }
    });
    assert(ownerLogin.status === 200 && ownerLogin.body?.token, "Owner login succeeds with JWT");
    const ownerToken = ownerLogin.body?.token;

    // 2e. Public admin registration rejected
    const rogueAdmin = await request("/auth/register", {
      method: "POST",
      body: { name: "Hacker", email: "hacker@test.com", password: "Password@123", role: "admin" }
    });
    assert(rogueAdmin.status === 400, "Public admin signup is strictly blocked");

    // 2f. Valid student signup
    const testEmail = `student-${Date.now()}@test.local`;
    const studentSignup = await request("/auth/register", {
      method: "POST",
      body: { name: "Test Student", email: testEmail, password: "Password@123", role: "student" }
    });
    assert(studentSignup.status === 201 && studentSignup.body?.token, "Student signup succeeds with 201");
    let studentToken = studentSignup.body?.token;
    const studentUser = studentSignup.body?.user;

    // 2g. Duplicate email rejected
    const dupSignup = await request("/auth/register", {
      method: "POST",
      body: { name: "Duplicate", email: testEmail, password: "Password@123", role: "student" }
    });
    assert(dupSignup.status === 409, "Duplicate email registration rejected with 409");

    console.log("\n=== 3. Security & Protected Route Checks ===");
    // 3a. Unauthorized access without token
    const unauth = await request("/hostels/mine");
    assert(unauth.status === 401, "Protected route without token returns 401");

    // 3b. Role authorization check (student accessing owner route)
    const roleMismatch = await request("/hostels/mine", {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert(roleMismatch.status === 403, "Student accessing owner route returns 403 Forbidden");

    // 3c. Owner accessing admin route
    const ownerOnAdmin = await request("/auth/admin/overview", {
      headers: { Authorization: `Bearer ${ownerToken}` }
    });
    assert(ownerOnAdmin.status === 403, "Owner accessing admin route returns 403 Forbidden");

    // 3d. Expired / invalid token handling
    const expiredToken = jwt.sign(
      { id: 999, email: "ghost@test.com", role: "student" },
      process.env.JWT_SECRET || "default_test_secret",
      { expiresIn: -10 }
    );
    const expiredCheck = await request("/auth/me", {
      headers: { Authorization: `Bearer ${expiredToken}` }
    });
    assert(expiredCheck.status === 401, "Expired token returns 401 Unauthorized");

    console.log("\n=== 4. Hostel Submission & Admin Moderation Flow ===");
    // 4a. Owner creates new hostel
    const createHostel = await request("/hostels", {
      method: "POST",
      headers: { Authorization: `Bearer ${ownerToken}` },
      body: {
        name: `Automated Test Hostel ${Date.now()}`,
        city: "Hyderabad",
        address: "Gachibowli, Hyderabad",
        description: "Test hostel for automated verification suite",
        gender: "Boys",
        amenities: ["WiFi", "Food", "CCTV"],
        rules: ["No smoking", "Curfew at 10 PM"]
      }
    });
    assert(createHostel.status === 201 && createHostel.body?.id, "Owner creates new hostel (201 Created)");
    const newHostelId = createHostel.body?.id;
    assert(createHostel.body?.status === "pending", "Newly created hostel defaults to pending approval");

    // 4b. Owner can view their own pending hostel
    const ownerViewPending = await request(`/hostels/${newHostelId}`, {
      headers: { Authorization: `Bearer ${ownerToken}` }
    });
    assert(ownerViewPending.status === 200, "Owner can preview their own pending hostel");

    // 4c. Public request for pending hostel is hidden (404)
    const publicPending = await request(`/hostels/${newHostelId}`);
    assert(publicPending.status === 404, "Public users cannot access unapproved pending hostels (404)");

    // 4d. Admin overview sees pending hostel
    const adminOverview = await request("/auth/admin/overview", {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const foundPending = adminOverview.body?.pendingHostels?.some(h => h.id === newHostelId);
    assert(foundPending, "Admin overview lists pending hostel");

    // 4e. Admin approves hostel
    const adminApprove = await request(`/auth/admin/hostels/${newHostelId}/review`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { decision: "approved" }
    });
    assert(adminApprove.status === 200 && adminApprove.body?.status === "approved", "Admin approves hostel listing");

    // 4f. Now public can view the approved hostel
    const publicApproved = await request(`/hostels/${newHostelId}`);
    assert(publicApproved.status === 200 && publicApproved.body?.id === newHostelId, "Public can view approved hostel");

    console.log("\n=== 5. Room Management & Vacancies ===");
    // 5a. Owner adds a room
    const addRoom = await request(`/rooms/hostel/${newHostelId}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${ownerToken}` },
      body: {
        room_type: "2 Sharing",
        price_per_month: 6500,
        total_beds: 4,
        available_beds: 4,
        description: "Double sharing room with study desk"
      }
    });
    assert(addRoom.status === 201 && addRoom.body?.id, "Owner adds room type (201 Created)");
    const roomId = addRoom.body?.id;

    // 5b. Get rooms for hostel
    const getRooms = await request(`/rooms/hostel/${newHostelId}`);
    assert(getRooms.status === 200 && getRooms.body?.length > 0, "Public / students can list hostel rooms");

    console.log("\n=== 6. Food Menu & Updates ===");
    // 6a. Owner updates weekly menu batch
    const saveMenu = await request(`/menu/hostel/${newHostelId}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${ownerToken}` },
      body: {
        menu: {
          Monday: "Idli, Rice & Dal, Roti",
          Tuesday: "Dosa, Sambar, Paneer"
        }
      }
    });
    assert(saveMenu.status === 200 && saveMenu.body?.menu?.length === 2, "Owner batch saves weekly food menu");

    // 6b. Owner posts announcement
    const postUpdate = await request(`/updates/hostel/${newHostelId}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${ownerToken}` },
      body: {
        title: "Orientation Meeting",
        content: "New residents welcome meeting on Sunday at 5 PM."
      }
    });
    assert(postUpdate.status === 201 && postUpdate.body?.id, "Owner posts announcement");
    const updateId = postUpdate.body?.id;

    console.log("\n=== 7. Booking & Payment Lifecycle ===");
    // 7a. Student books the room
    const bookRoom = await request("/bookings", {
      method: "POST",
      headers: { Authorization: `Bearer ${studentToken}` },
      body: {
        hostel_id: newHostelId,
        room_id: roomId,
        amount: 6500,
        check_in: "2026-11-01"
      }
    });
    assert(bookRoom.status === 201 && bookRoom.body?.id, "Student completes room booking & deposit payment (201)");
    const bookingId = bookRoom.body?.id;

    // 7b. Verify bed inventory decremented
    const checkRoomAfterBook = await request(`/rooms/hostel/${newHostelId}`);
    const updatedRoom = checkRoomAfterBook.body?.find(r => r.id === roomId);
    assert(updatedRoom?.available_beds === 3, "Room available beds decremented from 4 to 3");

    // 7c. Student views their bookings
    const myBookings = await request("/bookings/mine", {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert(myBookings.status === 200 && myBookings.body?.some(b => b.id === bookingId), "Student booking history displays active booking");

    // 7d. Student views payment history
    const myPayments = await request("/payments/mine", {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert(myPayments.status === 200 && myPayments.body?.length > 0, "Student payment history shows initial transaction");

    // 7e. Student pays monthly fee
    const payFee = await request("/payments/monthly-fee", {
      method: "POST",
      headers: { Authorization: `Bearer ${studentToken}` },
      body: { hostel_id: newHostelId, amount: 6500 }
    });
    assert(payFee.status === 201 && payFee.body?.transaction_id, "Student pays monthly fee successfully");

    console.log("\n=== 8. Owner Booking Decisions & Residents View ===");
    // 8a. Owner lists bookings
    const ownerBookings = await request("/bookings/owner", {
      headers: { Authorization: `Bearer ${ownerToken}` }
    });
    assert(ownerBookings.status === 200 && ownerBookings.body?.some(b => b.id === bookingId), "Owner lists bookings with student details");

    // 8b. Owner lists confirmed residents
    const ownerResidents = await request("/bookings/residents", {
      headers: { Authorization: `Bearer ${ownerToken}` }
    });
    assert(ownerResidents.status === 200 && ownerResidents.body?.some(r => r.booking_id === bookingId), "Owner views active resident roster");

    // 8c. Owner updates booking status (e.g. cancels booking and restores bed)
    const cancelBooking = await request(`/bookings/${bookingId}/status`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${ownerToken}` },
      body: { status: "cancelled" }
    });
    assert(cancelBooking.status === 200 && cancelBooking.body?.booking?.status === "cancelled", "Owner updates booking status to cancelled");

    const checkRoomAfterCancel = await request(`/rooms/hostel/${newHostelId}`);
    const restoredRoom = checkRoomAfterCancel.body?.find(r => r.id === roomId);
    assert(restoredRoom?.available_beds === 4, "Available beds correctly restored back to 4 upon cancellation");

    // Re-confirm for subsequent tests
    await request(`/bookings/${bookingId}/status`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${ownerToken}` },
      body: { status: "confirmed" }
    });

    console.log("\n=== 9. Complaints Creation & Moderation ===");
    // 9a. Student submits complaint
    const submitComplaint = await request("/complaints", {
      method: "POST",
      headers: { Authorization: `Bearer ${studentToken}` },
      body: {
        hostel_id: newHostelId,
        category: "maintenance",
        title: "WiFi router restarting frequently",
        description: "The 2nd floor router drops connection every few minutes."
      }
    });
    assert(submitComplaint.status === 201 && submitComplaint.body?.id, "Student submits complaint (201)");
    const complaintId = submitComplaint.body?.id;

    // 9b. Student views their complaints
    const myComplaints = await request("/complaints/mine", {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert(myComplaints.status === 200 && myComplaints.body?.some(c => c.id === complaintId), "Student views submitted complaint");

    // 9c. Owner views complaints for their hostel
    const ownerComplaints = await request("/complaints/owner", {
      headers: { Authorization: `Bearer ${ownerToken}` }
    });
    assert(ownerComplaints.status === 200 && ownerComplaints.body?.some(c => c.id === complaintId), "Owner views complaint for their hostel");

    // 9d. Owner responds and marks reviewing
    const ownerRespond = await request(`/complaints/${complaintId}/status`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${ownerToken}` },
      body: { status: "reviewing", response: "Technician called for today 4 PM." }
    });
    assert(ownerRespond.status === 200 && ownerRespond.body?.complaint?.status === "reviewing", "Owner responds and updates complaint to reviewing");

    // 9e. Admin resolves complaint
    const adminResolve = await request(`/complaints/${complaintId}/status`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { status: "resolved", response: "Issue verified resolved by technician." }
    });
    assert(adminResolve.status === 200 && adminResolve.body?.complaint?.status === "resolved", "Admin can resolve complaint with note");

    console.log("\n=== 10. Reviews Flow ===");
    // 10a. Resident submits review
    const submitReview = await request("/reviews", {
      method: "POST",
      headers: { Authorization: `Bearer ${studentToken}` },
      body: {
        hostel_id: newHostelId,
        rating: 5,
        comment: "Great food and study atmosphere!"
      }
    });
    assert(submitReview.status === 201 && submitReview.body?.id, "Resident submits hostel review (201)");

    // 10b. Public reads reviews
    const hostelReviews = await request(`/reviews/hostel/${newHostelId}`);
    assert(hostelReviews.status === 200 && hostelReviews.body?.length > 0, "Public can read reviews for hostel");

    // 10c. Owner views reviews
    const ownerReviews = await request("/reviews/owner", {
      headers: { Authorization: `Bearer ${ownerToken}` }
    });
    assert(ownerReviews.status === 200 && ownerReviews.body?.length > 0, "Owner views reviews for their hostel");

    console.log("\n=== 11. Wishlist Persistence ===");
    // 11a. Student adds hostel to wishlist
    const addWishlist = await request(`/wishlist/${newHostelId}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert(addWishlist.status === 201, "Student adds hostel to wishlist (201)");

    // 11b. Student retrieves wishlist
    const getWishlist = await request("/wishlist", {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert(getWishlist.status === 200 && getWishlist.body?.some(h => h.id === newHostelId), "Wishlist persists in database and is retrieved");

    // 11c. Student removes hostel from wishlist
    const removeWishlist = await request(`/wishlist/${newHostelId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert(removeWishlist.status === 200, "Student removes hostel from wishlist (200)");

    console.log("\n=== 12. Password Change & Account Security ===");
    // 12a. Change password
    const changePass = await request("/auth/change-password", {
      method: "POST",
      headers: { Authorization: `Bearer ${studentToken}` },
      body: { currentPassword: "Password@123", newPassword: "NewSecurePassword@456" }
    });
    assert(changePass.status === 200, "Password updated successfully (200)");

    // 12b. Old password fails
    const oldLogin = await request("/auth/login", {
      method: "POST",
      body: { email: testEmail, password: "Password@123", role: "student" }
    });
    assert(oldLogin.status === 401, "Login with old password now fails (401)");

    // 12c. New password succeeds
    const newLogin = await request("/auth/login", {
      method: "POST",
      body: { email: testEmail, password: "NewSecurePassword@456", role: "student" }
    });
    assert(newLogin.status === 200 && newLogin.body?.token, "Login with new password succeeds");
    studentToken = newLogin.body?.token;

    // 12d. Delete test account
    const deleteAccount = await request("/auth/me", {
      method: "DELETE",
      headers: { Authorization: `Bearer ${studentToken}` },
      body: { password: "NewSecurePassword@456" }
    });
    assert(deleteAccount.status === 200, "Account deleted successfully (200)");

    // Clean up test hostel
    const db = await getDb();
    await db.run("DELETE FROM hostels WHERE id = ?", newHostelId);
    console.log("  Cleaned up temporary test hostel.");

  } catch (err) {
    console.error("Test execution error:", err);
    failed++;
  } finally {
    server.close();
    console.log(`\n================================`);
    console.log(`Test Results: ${passed} Passed, ${failed} Failed`);
    console.log(`================================`);
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();
