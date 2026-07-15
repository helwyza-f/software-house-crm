FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

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
