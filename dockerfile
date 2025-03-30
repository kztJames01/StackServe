# Base image
FROM node:18-alpine AS base
WORKDIR /app

# Dependencies layer
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci

# Builder layer
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Set Firebase config as build args if needed
ARG NEXT_PUBLIC_FIREBASE_API_KEY
ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID
ARG NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ARG NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ARG NEXT_PUBLIC_FIREBASE_APP_ID
# Build the application
RUN npm run build

# Runner layer
FROM base AS runner
ENV NODE_ENV production
# Copy necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.ts ./next.config.ts

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
