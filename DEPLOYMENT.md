# HostelHub — Production Deployment Guide

This guide covers deploying the unified HostelHub application where **both the React frontend and Node.js/Express backend are hosted together** as a single service.

---

## Architecture Overview

* **Unified Server**: The Express server ([`backend/src/server.js`](file:///c:/Users/sahas/OneDrive/Desktop/HostelHub/backend/src/server.js)) serves:
  * Static React SPA (`frontend/dist`) on all root web routes (`/`, `/hostels`, `/resident`, `/owner`, `/admin`)
  * REST API endpoints on `/api/*`
  * Uploaded images on `/uploads/*`
* **Zero CORS Configuration Needed**: Since frontend and backend share the same origin, browser requests automatically talk to `/api` without cross-origin blocks.
* **Persistent Storage**: Uses SQLite database (`backend/hostelhub.db`) and local folder storage for uploaded hostel photos (`backend/uploads/hostels`).

---

## 1. Pushing to GitHub (Prerequisite)

Initialize git inside the `HostelHub` folder and push to your GitHub account:

```bash
cd c:\Users\sahas\OneDrive\Desktop\HostelHub

# Initialize git repository
git init
git add .
git commit -m "HostelHub production-ready unified build"

# Link to your GitHub repository (replace with your repo URL)
git branch -M main
git remote add origin https://github.com/<your-username>/hostelhub.git
git push -u origin main
```

---

## 2. Deploy to Render (Recommended Free Option)

Render provides free hosting for Node.js web services.

1. Go to [render.com](https://render.com) and sign in.
2. Click **New +** → **Web Service**.
3. Connect your GitHub repository (`hostelhub`).
4. Configure the service:
   * **Name**: `hostelhub`
   * **Environment**: `Node`
   * **Build Command**: `npm run install:all && npm run build`
   * **Start Command**: `npm start`
   * **Plan**: `Free`
5. Under **Advanced / Environment Variables**, add:
   * `NODE_ENV`: `production`
   * `JWT_SECRET`: *(Generate a secure random string or click Generate)*
   * `ALLOWED_ORIGINS`: `*`
   * `UPLOAD_DIR`: `uploads`
   * `MAX_FILE_SIZE_MB`: `5`
6. Click **Create Web Service**.
7. Render will build the React frontend, set up the backend, and deploy your live URL (e.g. `https://hostelhub.onrender.com`).

*(Note: `render.yaml` is also included in the repository for automated Blueprint deployment).*

---

## 3. Deploy to Railway

Railway is fast and auto-detects Node.js projects:

1. Go to [railway.app](https://railway.app) and sign in.
2. Click **New Project** → **Deploy from GitHub repo**.
3. Select your `hostelhub` repository.
4. Add Environment Variables:
   * `JWT_SECRET`: *(any secure random string)*
   * `NODE_ENV`: `production`
   * `PORT`: `5000`
5. Railway reads [`railway.json`](file:///c:/Users/sahas/OneDrive/Desktop/HostelHub/railway.json), builds the frontend, and runs `npm start`.

---

## 4. Deploy with Docker / Docker Compose

If you are deploying to any Linux VPS, AWS EC2, or DigitalOcean droplet:

```bash
# Clone the repository
git clone https://github.com/<your-username>/hostelhub.git
cd hostelhub

# Start containerized application
docker compose up -d --build
```

The container automatically:
- Builds the Vite production bundle in a build container.
- Starts the production Node.js runner on port `5000`.
- Mounts persistent Docker volumes for the SQLite database and photo uploads.

---

## 5. Local Production Run

To test the production build locally at any time:

```bash
# 1. Build frontend
npm run build

# 2. Start unified server
npm start
```

Open `http://localhost:5000` in your browser. Both the web UI and `/api` are live and operational.
