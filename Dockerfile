FROM node:20-alpine

LABEL org.opencontainers.image.title="cyberpunk-pixel-office" \
      org.opencontainers.image.description="Cyberpunk Pixel Office（事件驅動多代理像素戰情室）— Default Preset: TMF Micro Taiwan Index Futures" \
      org.opencontainers.image.source="https://github.com/ai-20240303/cyberpunk-pixel-office"

ENV TZ=Asia/Taipei \
    PORT=19001 \
    PIXEL_DATA_DIR=/app/data \
    PRESET=tmf

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY server.js index.html dashboard.html ./
COPY assets ./assets
COPY sample-data ./sample-data
COPY scripts ./scripts

RUN mkdir -p /app/data

EXPOSE 19001

CMD ["node", "server.js"]
