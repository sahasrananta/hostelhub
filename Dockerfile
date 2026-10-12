# Multi-stage Dockerfile for HostelHub Unified Deployment
FROM node:20-alpine AS builder

WORKDIR /app

# Build Frontend
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm ci

COPY frontend/ ./frontend/
RUN cd frontend && npm run build

# Setup Backend
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5000

# Install production dependencies for backend
COPY backend/package*.json ./backend/
RUN cd backend && npm ci --omit=dev

# Copy backend source & built frontend assets
COPY backend/ ./backend/
COPY --from=builder /app/frontend/dist ./frontend/dist

# Ensure upload and database storage directories exist
RUN mkdir -p /app/backend/uploads/hostels

EXPOSE 5000

WORKDIR /app/backend
CMD ["node", "src/server.js"]
