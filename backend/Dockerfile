FROM node:20-alpine

WORKDIR /app

# better-sqlite3 has a native binding with no musl prebuild — needs a toolchain to compile
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

RUN mkdir -p /data

ENV NODE_ENV=production
ENV PORT=3001
ENV DB_PATH=/data/studenthub.db

EXPOSE 3001

CMD ["node", "server.js"]
