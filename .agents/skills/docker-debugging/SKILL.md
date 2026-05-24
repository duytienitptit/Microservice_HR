---
name: docker-debugging
description: Guides debugging Docker Compose issues including container crashes, connection refused errors, port conflicts, and service health failures. Use when docker compose up fails, services won't start, or containers keep restarting.
---

# Docker Debugging

## When to Use

- `docker compose up` fails or services crash
- "Connection refused" errors between services
- Health checks failing
- Database connection issues
- RabbitMQ connection issues
- Port conflicts on host machine

## Step-by-Step Debug Workflow

```
Problem detected
├── 1. Check which containers are running
├── 2. Read logs of the failing container
├── 3. Check health status
├── 4. Verify network connectivity
└── 5. Apply fix from Common Failures below
```

## Diagnostic Commands

### 1. Check container status

```bash
docker compose ps                          # List all containers + status
docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
```

### 2. Read logs

```bash
docker compose logs <service>              # All logs for a service
docker compose logs <service> --tail 50    # Last 50 lines
docker compose logs <service> -f           # Follow live
docker compose logs --since 5m             # Last 5 minutes, all services
```

### 3. Health check status

```bash
docker inspect --format='{{.State.Health.Status}}' <container_name>
docker inspect --format='{{json .State.Health}}' <container_name> | jq
```

### 4. Network connectivity

```bash
# Enter a running container and test connectivity
docker compose exec <service> sh
# Inside container:
curl http://core-service:3001/health
curl http://rabbitmq:5672                  # Should get AMQP response
ping postgres
```

### 5. Reset everything

```bash
docker compose down -v                     # Stop + remove volumes (DESTRUCTIVE)
docker compose build --no-cache            # Rebuild images from scratch
docker compose up -d                       # Start in background
```

## Common Failures & Solutions

### PostgreSQL: "database ai_db does not exist"

**Cause:** Init script didn't run (volumes already existed from before).

```bash
docker compose down -v                     # Remove old volumes
docker compose up postgres -d              # Recreate with init script
docker compose exec postgres psql -U user -l  # Verify databases exist
```

### RabbitMQ: "Connection refused on port 5672"

**Cause:** RabbitMQ takes 15-30s to start. Service tried to connect too early.

**Fix:** Ensure `depends_on` with `condition: service_healthy` and RabbitMQ has a healthcheck.

### Service: "ECONNREFUSED" to another service

**Cause:** Target service not ready yet, or wrong hostname.

**Checklist:**
1. Is the target service running? `docker compose ps`
2. Is the hostname correct? Use service name from docker-compose.yml (e.g., `postgres`, not `localhost`)
3. Is the port correct? Use internal port, not host-mapped port
4. Does the target service have a healthcheck? Is it healthy?

### MongoDB: "MongoNetworkError"

```bash
docker compose logs mongodb                # Check if mongo started
docker compose exec mongodb mongosh --eval "db.adminCommand('ping')"
```

### Nginx: "502 Bad Gateway"

**Cause:** Backend service not running or not listening on expected port.

```bash
docker compose logs api-gateway
docker compose exec api-gateway curl http://core-service:3001/health
```

### Build fails: "npm ci" or "pip install" errors

```bash
docker compose build --no-cache <service>  # Clean rebuild
# Check Dockerfile for correct base image version
```

## Port Mapping Reference

| Service | Internal | Host |
|---------|----------|------|
| Nginx | 80 | 80 |
| RabbitMQ Management | 15672 | 15672 |
| All others | varies | NOT exposed |

## Tips

- Always use `docker compose logs` before googling errors
- If in doubt, `docker compose down -v && docker compose up --build` fixes most issues
- Never expose service ports to host in production — only through API Gateway
- Use `docker compose exec <service> sh` to debug inside containers
