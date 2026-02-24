FROM node:20-alpine

WORKDIR /app

# Install build dependencies for better-sqlite3
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

EXPOSE 3002

CMD ["npm", "start"]
