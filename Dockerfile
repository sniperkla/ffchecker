FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

RUN npm cache clean --force \
 && npm ci

COPY . .

EXPOSE 5001

CMD ["npm", "start"]