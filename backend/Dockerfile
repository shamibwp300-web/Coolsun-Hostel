FROM python:3.9-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install gunicorn
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt gunicorn

# Copy all backend files into /app/backend/
# So imports like "from backend.routes..." work correctly
COPY . ./backend/

# Ensure volume mount points exist
RUN mkdir -p /app/instance /app/uploads
RUN chmod -R 777 /app/instance /app/uploads

EXPOSE 5000

# Run with gunicorn
CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "backend.app:create_app()"]
