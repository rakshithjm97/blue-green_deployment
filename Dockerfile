#############################
# Multi-stage build for frontend (Vite) and backend (Flask)
#############################

# --- frontend build stage ---
FROM node:18-alpine AS frontend-build
WORKDIR /app/frontend

# install dependencies first (package*.json copy helps layer caching)
COPY frontend/package*.json ./
RUN npm ci --silent

# copy the rest and build
COPY frontend/ ./
RUN npm run build


# --- backend runtime stage ---
FROM python:3.11-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1

WORKDIR /app

# system deps (if any) and pip install
RUN apt-get update && apt-get install -y --no-install-recommends build-essential curl git && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY backend/ ./backend

# Copy built frontend into backend's `dist` so Flask can serve it
COPY --from=frontend-build /app/frontend/dist ./backend/dist

WORKDIR /app/backend

EXPOSE 5000

ENV FLASK_ENV=production
CMD ["python", "app.py"]
