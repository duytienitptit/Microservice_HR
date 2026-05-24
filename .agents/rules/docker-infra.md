# Docker & Infrastructure

## Required Image Versions

| Service | Image |
|---|---|
| PostgreSQL | `postgres:16` |
| MongoDB | `mongo:7` |
| Qdrant | `qdrant/qdrant:latest` |
| RabbitMQ | `rabbitmq:3-management` |
| Nginx | `nginx:alpine` |
| Mailpit | `axllent/mailpit:latest` |

## Port Mapping

| Service | Internal Port | Exposed to Host |
|---|---|---|
| API Gateway (Nginx) | 80 | `80:80` |
| Core Service | 3001 | Internal only |
| AI Service | 3002 | Internal only |
| RAG Service | 3003 | Internal only |
| Assessment Service | 3004 | Internal only |
| RabbitMQ Management UI | 15672 | `15672:15672` |
| PostgreSQL | 5432 | Internal only |
| MongoDB | 27017 | Internal only |
| Qdrant | 6333 | Internal only |
| Mailpit Web UI | 8025 | `8025:8025` |

## Infrastructure Notes

- `docker compose up` MUST start the entire system from scratch
- All services MUST start within 60 seconds
- Use Docker Compose `healthcheck` for service readiness
- Use `depends_on` with `condition: service_healthy` for startup ordering
- Service ports are NOT exposed to host in production — only via API Gateway
