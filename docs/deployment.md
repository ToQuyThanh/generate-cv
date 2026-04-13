# Deployment Guide — generate-cv

> Hướng dẫn deploy toàn bộ stack bằng Docker Compose (production).

---

## Yêu cầu hệ thống

| Phần | Tối thiểu |
|---|---|
| OS | Ubuntu 22.04 LTS / Debian 12 |
| CPU | 2 vCPU |
| RAM | 4 GB |
| Disk | 20 GB SSD |
| Docker | 24.x+ |
| Docker Compose | v2.x+ |

---

## Cấu trúc services

```
docker-compose.yml
├── postgres      — PostgreSQL 16 (internal network only)
├── redis         — Redis 7     (internal network only)
├── migrate       — goose migration (runs once, exits)
├── backend       — Go API server  (port 8080, localhost only)
└── frontend      — Next.js        (port 3000, public)
```

---

## Bước 1 — Clone và chuẩn bị

```bash
git clone https://github.com/yourname/generate-cv.git
cd generate-cv
```

---

## Bước 2 — Tạo file .env

```bash
cp .env.example .env
```

Chỉnh sửa `.env` — điền các giá trị `[REQUIRED]`:

```bash
nano .env
```

Các biến **bắt buộc** phải đổi:

| Biến | Lý do |
|---|---|
| `DB_PASSWORD` | Mật khẩu PostgreSQL production |
| `REDIS_PASSWORD` | Mật khẩu Redis |
| `JWT_SECRET` | Bí mật ký JWT, ≥ 32 ký tự ngẫu nhiên |
| `GOOGLE_CLIENT_ID` / `SECRET` | Nếu dùng Google OAuth |
| `CORS_ORIGINS` | Domain frontend production |
| `NEXT_PUBLIC_API_URL` | URL backend (public) |
| `NEXT_PUBLIC_APP_URL` | URL frontend |

Tạo JWT_SECRET ngẫu nhiên:
```bash
openssl rand -hex 32
```

---

## Bước 3 — Build và khởi động

```bash
# Build tất cả images
docker compose build

# Khởi động toàn bộ stack (migrate chạy tự động)
docker compose up -d

# Theo dõi log
docker compose logs -f
```

---

## Bước 4 — Kiểm tra health

```bash
# Backend health
curl http://localhost:8080/health
# → {"status":"ok"}

# Frontend
curl -I http://localhost:3000
# → HTTP/1.1 200 OK

# Tất cả containers
docker compose ps
```

---

## Update phiên bản mới

```bash
git pull origin main

# Rebuild images với code mới
docker compose build

# Restart services (zero-downtime không đảm bảo, nên làm ngoài giờ cao điểm)
docker compose up -d --force-recreate backend frontend

# Migration tự động chạy khi có thay đổi schema
docker compose run --rm migrate
```

---

## Backup PostgreSQL

```bash
# Backup thủ công
docker exec gcv_postgres pg_dump -U postgres generate_cv > backup_$(date +%Y%m%d).sql

# Restore
docker exec -i gcv_postgres psql -U postgres generate_cv < backup_20260413.sql
```

Script backup tự động (cron hàng ngày 2:00 AM):
```bash
# Thêm vào crontab: crontab -e
0 2 * * * docker exec gcv_postgres pg_dump -U postgres generate_cv | gzip > /backups/gcv_$(date +\%Y\%m\%d).sql.gz
```

---

## Cấu hình Nginx (Reverse Proxy)

Nếu dùng Nginx phía trước để xử lý HTTPS:

```nginx
# /etc/nginx/sites-available/generate-cv
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate     /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # Frontend
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API (nếu cần expose thẳng, không qua Next.js rewrite)
    location /api/v1/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## Troubleshooting

### Migration fail
```bash
# Kiểm tra log
docker compose logs migrate

# Chạy lại migration thủ công
docker compose run --rm migrate
```

### Backend không kết nối được PostgreSQL
```bash
# Kiểm tra postgres health
docker compose ps postgres
docker compose exec postgres pg_isready -U postgres
```

### Frontend build fail
```bash
# Xem log build
docker compose logs frontend

# Rebuild không dùng cache
docker compose build --no-cache frontend
```

### Xoá toàn bộ và bắt đầu lại
```bash
# ⚠️ Xoá cả data volume — mất database!
docker compose down -v
docker compose up -d
```

---

## Security Checklist Production

- [ ] File `.env` **không** trong git (đã có trong `.gitignore`)
- [ ] PostgreSQL không expose port ra ngoài host
- [ ] Redis không expose port ra ngoài host, có password
- [ ] Backend bind `127.0.0.1:8080` (không phải `0.0.0.0`)
- [ ] HTTPS bật qua Nginx + Let's Encrypt
- [ ] `JWT_SECRET` ≥ 32 ký tự ngẫu nhiên
- [ ] `CORS_ORIGINS` chỉ chứa domain production
- [ ] Sentry DSN cấu hình để catch lỗi production
- [ ] Backup database tự động hàng ngày

---

*Cập nhật: Tháng 4/2026 — v1.0.0*
