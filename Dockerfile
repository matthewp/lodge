# Build stage for frontend
FROM docker.io/node:22-alpine AS frontend-builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY ui/ ./ui/
COPY build.js ./
COPY tailwind.config.js ./
RUN npm run build

# Build stage for backend
FROM docker.io/golang:1.24-alpine AS backend-builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

COPY *.go ./
COPY ui/index.html ./ui/
COPY --from=frontend-builder /app/ui/dist ./ui/dist/
RUN CGO_ENABLED=0 GOOS=linux go build -o lodge .

# Final production stage
FROM docker.io/alpine:latest

RUN apk --no-cache add ca-certificates
WORKDIR /root/

COPY --from=backend-builder /app/lodge .

# Create data directory
RUN mkdir -p /data

# Expose port
EXPOSE 1717

# Use environment variables for admin credentials
ENV ADMIN_USER=""
ENV ADMIN_PASSWORD=""

# Run the binary
CMD ["./lodge", "--data-dir", "/data"]