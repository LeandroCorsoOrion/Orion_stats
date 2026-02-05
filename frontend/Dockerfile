FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source
COPY . .

# Build for production
RUN npm run build

# Use simple static server
RUN npm install -g serve

EXPOSE 5173

# Serve the built app
CMD ["serve", "-s", "dist", "-l", "5173"]
