# Architecture — generate-cv

## Sơ đồ hạ tầng production

```
                    ┌─────────────────────────────┐
                    │        Cloudflare CDN        │
                    │  (DDoS protection + Cache)   │
                    └──────────────┬──────────────┘
                                   │ HTTPS
                    ┌──────────────▼──────────────┐
                    │        Nginx (TLS termination)│
                    │        On-premise Server      │
                    └──────────────┬──────────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              │                    │                     │
    ┌─────────▼──────────┐  ┌──────▼──────────┐         │
    │  Frontend (Next.js) │  │  Backend (Go)   │         │
    │  container :3000    │  │  container :8080│         │
    └────────────────────┘  └──────┬──────────┘         │
                                   │                     │
                      ┌────────────┼───────────┐         │
                      │            │           │         │
           ┌──────────▼──┐  ┌─────▼──────┐    │         │
           │ PostgreSQL 16│  │  Redis 7   │    │         │
           │ container    │  │ container  │    │         │
           │ (internal)   │  │ (internal) │    │         │
           └─────────────┘  └────────────┘    │         │
                                               │         │
                                    ┌──────────▼──────┐  │
                                    │  GCS (GCP)      │  │
                                    │  File storage   │  │
                                    └─────────────────┘  │
```

## Docker network topology

```
docker-compose.yml
│
├── backend_net (bridge)
│   ├── postgres          (gcv_postgres)
│   ├── redis             (gcv_redis)
│   ├── migrate           (gcv_migrate, exits after run)
│   └── backend           (gcv_backend) ← port 127.0.0.1:8080 exposed
│
└── frontend_net (bridge)
    ├── backend           (gcv_backend) ← dual-network
    └── frontend          (gcv_frontend) ← port 3000 exposed
```

**Lý do phân tách network:**
- `postgres` và `redis` chỉ trong `backend_net` → không thể truy cập từ frontend container
- `backend` tham gia cả 2 network → frontend có thể reach backend
- Không service nào có thể reach `postgres`/`redis` từ frontend_net

## Request flow

```
Browser
  → HTTPS → Nginx (on-premise)
  → HTTP  → Frontend container :3000
              ↓ Next.js rewrite: /api/* → backend
  → HTTP  → Backend container :8080
              ↓
           PostgreSQL (query)
           Redis (cache / rate-limit / sessions)
              ↓
           Response → Browser
```

## Service dependencies

| Service | Depends on | Startup condition |
|---|---|---|
| postgres | - | healthy (pg_isready) |
| redis | - | healthy (redis-cli ping) |
| migrate | postgres | postgres healthy |
| backend | postgres, redis, migrate | migrate completed |
| frontend | backend | backend healthy |

## Ports summary

| Service | Internal | External | Bind |
|---|---|---|---|
| postgres | 5432 | ❌ không expose | - |
| redis | 6379 | ❌ không expose | - |
| backend | 8080 | 8080 | 127.0.0.1 only |
| frontend | 3000 | 3000 | 0.0.0.0 |

> `backend` bind `127.0.0.1` để chỉ Nginx (cùng host) có thể truy cập trực tiếp.
> `postgres` và `redis` hoàn toàn nằm trong Docker network nội bộ.
