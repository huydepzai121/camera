FROM node:20-alpine

# Cài FFmpeg
RUN apk add --no-cache ffmpeg

WORKDIR /app

# Copy package files và install
COPY package.json package-lock.json ./
RUN npm ci --production

# Copy source code
COPY src/ ./src/
COPY views/ ./views/
COPY public/ ./public/

# Tạo thư mục data
RUN mkdir -p data/recordings data/snapshots

# Expose port
EXPOSE 3000

# Biến môi trường mặc định
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
ENV DB_PATH=./data/camera.db
ENV RECORDINGS_DIR=./data/recordings
ENV SNAPSHOTS_DIR=./data/snapshots

CMD ["node", "src/server.js"]
