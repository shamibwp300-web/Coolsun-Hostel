# Build step
FROM node:18-alpine AS builder

# Add a build-time ARG to trace the build version if needed
ARG BUILD_VERSION=1.0.0
ENV BUILD_VERSION=$BUILD_VERSION

WORKDIR /app

# Copy package files first to leverage Docker cache
COPY frontend/package*.json ./

# Use npm ci for faster, more stable builds during deployment
RUN npm ci

COPY frontend/ ./
RUN npm run build

# Serve with Nginx
FROM nginx:alpine
# Copy the built React app
COPY --from=builder /app/dist /usr/share/nginx/html
# Copy the custom Nginx config to proxy /api to the backend
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
