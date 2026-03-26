FROM python:3.9-slim

# Add a build-time ARG to trace the build version if needed
ARG BUILD_VERSION=1.0.0
ENV BUILD_VERSION=$BUILD_VERSION

WORKDIR /app

# Install system dependencies (cached)
RUN apt-get update && apt-get install -y --no-install-recommends \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install (cached)
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt gunicorn

# Copy all backend files
COPY backend/ ./backend/

# Ensure volume mount points exist
RUN mkdir -p /app/instance /app/uploads
RUN chmod -R 777 /app/instance /app/uploads

EXPOSE 5000

# Run with gunicorn
CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "backend.app:create_app()"]
