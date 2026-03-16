# Build step
FROM node:18-alpine AS builder
WORKDIR /app
COPY frontend/package*.json ./
RUN npm install
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
