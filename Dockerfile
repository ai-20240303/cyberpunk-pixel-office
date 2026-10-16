FROM node:20-alpine

ENV TZ=Asia/Taipei \
    PORT=19001

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

EXPOSE 19001

CMD ["node", "server.js"]
