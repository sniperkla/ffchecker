FROM node:20-alpine AS base

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --production

# Copy app sources
COPY . .

EXPOSE 5001

USER node

CMD ["node", "index.js"]
