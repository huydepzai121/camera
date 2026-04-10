# Hệ Thống Quản Lý Camera RTSP

Hệ thống quản lý camera RTSP tự host qua giao diện web, xây dựng bằng Node.js.

## Tính Năng

- **Xem trực tiếp** — Xem camera RTSP trên trình duyệt qua FFmpeg + WebSocket + JSMpeg
- **Xem nhiều camera** — Grid view 1x1, 2x2, 3x3, 4x4
- **Ghi hình** — Ghi thủ công hoặc theo lịch, lưu MP4 (H.264 passthrough), tự chia segment 15 phút
- **Chụp ảnh** — Chụp snapshot thủ công hoặc tự động theo chu kỳ, gallery xem lại
- **Phát hiện chuyển động** — Dựa trên FFmpeg scene change, 3 mức nhạy (thấp/trung bình/cao)
- **Điều khiển PTZ** — Pan/Tilt/Zoom cho camera hỗ trợ ONVIF, lưu preset
- **Cảnh báo** — Thông báo trong app, email (SMTP), webhook khi phát hiện chuyển động
- **Quản lý người dùng** — 3 vai trò: Admin, Operator, Viewer
- **Dashboard** — Tổng quan hệ thống: camera online/offline, dung lượng, CPU/RAM, cảnh báo gần đây
- **Giao diện tối** — Dark theme responsive, hoạt động trên desktop và tablet

## Yêu Cầu

- **Node.js** 18+ (nếu chạy trực tiếp)
- **FFmpeg** (đã có sẵn trong Docker image)
- **Docker** (nếu chạy bằng Docker)

## Cách 1: Chạy Bằng Docker (Khuyên Dùng)

### Khởi động nhanh

```bash
# Clone project
git clone <repo-url> camera
cd camera

# Sửa JWT_SECRET trong docker-compose.yml trước khi chạy
# Chạy
docker compose up -d
```

Mở trình duyệt: **http://localhost:3000**

Đăng nhập: `admin` / `admin123`

### Các lệnh Docker thường dùng

```bash
# Khởi động
docker compose up -d

# Xem log
docker compose logs -f

# Dừng
docker compose down

# Rebuild sau khi sửa code
docker compose up -d --build

# Xem dung lượng data
docker volume ls
```

### Cấu hình Docker

Sửa biến môi trường trong `docker-compose.yml`:

```yaml
environment:
  - JWT_SECRET=chuoi-bi-mat-cua-ban    # BẮT BUỘC đổi
  - DEFAULT_ADMIN_PASSWORD=matkhau123   # Mật khẩu admin mặc định
  - MAX_STORAGE_GB=100                  # Giới hạn lưu trữ
  - RECORDING_RETENTION_DAYS=30         # Tự xóa ghi hình sau N ngày
```

### Dữ liệu

Dữ liệu (database, ghi hình, ảnh chụp) được lưu trong Docker volume `camera-data`. Dữ liệu không mất khi restart container.

```bash
# Backup dữ liệu
docker cp camera-manager:/app/data ./backup-data

# Xóa toàn bộ dữ liệu (cẩn thận!)
docker compose down -v
```

## Cách 2: Chạy Trực Tiếp

### Cài FFmpeg

**macOS:**
```bash
brew install ffmpeg
```

**Ubuntu/Debian:**
```bash
sudo apt update && sudo apt install ffmpeg
```

**Windows:**
Tải từ https://ffmpeg.org/download.html và thêm vào PATH.

### Cài đặt và chạy

```bash
# Clone và cài dependencies
git clone <repo-url> camera
cd camera
npm install

# Tạo file cấu hình
cp .env.example .env
# Sửa .env (đặc biệt JWT_SECRET)

# Chạy development (auto-reload)
npm run dev

# Hoặc chạy production
npm start
```

Mở trình duyệt: **http://localhost:3000**

Đăng nhập: `admin` / `admin123`

## Hướng Dẫn Sử Dụng

### 1. Đăng nhập
Truy cập http://localhost:3000, đăng nhập với tài khoản admin.

### 2. Thêm camera
- Vào **Cameras** ở sidebar
- Bấm **+ Add Camera**
- Điền thông tin:
  - **Name**: Tên camera (VD: "Cửa trước")
  - **RTSP URL**: URL stream của camera (VD: `rtsp://admin:123456@192.168.1.100:554/stream1`)
  - **Location**: Vị trí (tùy chọn)
  - **ONVIF Host**: IP camera nếu muốn điều khiển PTZ

### 3. Xem camera
- Click tên camera → trang xem chi tiết
- Bấm **▶ Play** để xem stream trực tiếp
- Bấm **⛶ Fullscreen** để xem toàn màn hình

### 4. Xem nhiều camera (Grid)
- Vào **Grid View** ở sidebar
- Chọn layout: 1x1, 2x2, 3x3, 4x4
- Bấm **▶ Start All** để xem tất cả camera

### 5. Ghi hình
- Trong trang xem camera, bấm **⏺ Record** để bắt đầu ghi
- Bấm lại để dừng
- Vào **Recordings** để xem lại, tải xuống

### 6. Chụp ảnh
- Trong trang xem camera, bấm **📸 Snapshot**
- Vào **Snapshots** để xem gallery, chọn nhiều ảnh để tải ZIP

### 7. Cảnh báo chuyển động
- Khi sửa camera, bật **Motion Detection**
- Chọn độ nhạy: Low / Medium / High
- Khi phát hiện chuyển động → tự động tạo cảnh báo + chụp ảnh
- Vào **Alerts** để xem danh sách cảnh báo

### 8. Điều khiển PTZ
- Camera hỗ trợ ONVIF sẽ hiện bảng điều khiển PTZ
- Dùng phím mũi tên để xoay camera
- Zoom in/out
- Lưu vị trí preset để quay lại nhanh

## Biến Môi Trường

| Biến | Mặc định | Mô tả |
|------|----------|-------|
| `PORT` | 3000 | Cổng server |
| `JWT_SECRET` | (bắt buộc đổi) | Khóa bí mật cho JWT token |
| `DEFAULT_ADMIN_PASSWORD` | admin123 | Mật khẩu admin ban đầu |
| `DB_PATH` | ./data/camera.db | Đường dẫn database SQLite |
| `RECORDINGS_DIR` | ./data/recordings | Thư mục lưu ghi hình |
| `SNAPSHOTS_DIR` | ./data/snapshots | Thư mục lưu ảnh chụp |
| `MAX_STORAGE_GB` | 100 | Giới hạn dung lượng (GB) |
| `RECORDING_RETENTION_DAYS` | 30 | Tự xóa ghi hình sau N ngày |
| `SNAPSHOT_RETENTION_DAYS` | 7 | Tự xóa ảnh chụp sau N ngày |
| `FFMPEG_PATH` | ffmpeg | Đường dẫn FFmpeg |
| `STREAM_RESOLUTION` | 1024x768 | Độ phân giải stream |
| `STREAM_BITRATE` | 1000k | Bitrate stream |
| `STREAM_FPS` | 30 | FPS stream |
| `MOTION_SENSITIVITY` | medium | Độ nhạy phát hiện chuyển động |
| `MOTION_COOLDOWN_SECONDS` | 60 | Thời gian chờ giữa 2 cảnh báo |
| `SMTP_HOST` | (tùy chọn) | SMTP server gửi email cảnh báo |
| `WEBHOOK_URL` | (tùy chọn) | URL webhook nhận cảnh báo |

## Phân Quyền

| Quyền | Admin | Operator | Viewer |
|-------|-------|----------|--------|
| Xem stream | ✅ | ✅ | ✅ |
| Xem ghi hình / ảnh chụp | ✅ | ✅ | ✅ |
| Thêm / sửa camera | ✅ | ✅ | ❌ |
| Xóa camera | ✅ | ❌ | ❌ |
| Ghi hình | ✅ | ✅ | ❌ |
| Chụp ảnh | ✅ | ✅ | ❌ |
| Điều khiển PTZ | ✅ | ✅ | ❌ |
| Xác nhận cảnh báo | ✅ | ✅ | ❌ |
| Quản lý người dùng | ✅ | ❌ | ❌ |
| Cài đặt hệ thống | ✅ | ❌ | ❌ |

## Kiến Trúc

```
Trình duyệt ←→ Express (HTTP/EJS) ←→ SQLite
     ↕                    ↕
 WebSocket  ←→  FFmpeg (RTSP → MPEG1)  ←→  Camera IP (RTSP/ONVIF)
```

## RTSP URL Phổ Biến

| Hãng | URL mẫu |
|------|---------|
| Hikvision | `rtsp://admin:password@IP:554/Streaming/Channels/101` |
| Dahua | `rtsp://admin:password@IP:554/cam/realmonitor?channel=1&subtype=0` |
| Reolink | `rtsp://admin:password@IP:554/h264Preview_01_main` |
| Generic ONVIF | `rtsp://admin:password@IP:554/stream1` |

## License

MIT
