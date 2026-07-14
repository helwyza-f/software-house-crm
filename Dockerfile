FROM node:20-alpine

# Install build dependencies for native modules (better-sqlite3)
RUN apk add --no-cache python3 make g++ gcc libc-dev

WORKDIR /app

COPY package*.json ./

# Install dependencies (recompiles better-sqlite3 for Alpine target)
RUN npm install

# Copy application source
COPY . .

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Build Next.js application
RUN npm run build

EXPOSE 3000

# Start Next.js in production mode
CMD ["npm", "start"]
