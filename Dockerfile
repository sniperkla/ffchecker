FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

RUN npm i
COPY . .

EXPOSE 5001

CMD ["npm", "start"]