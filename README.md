# OpsHub — Operations & Task Management Platform

Full-stack app: FastAPI + PostgreSQL + Redis + Celery + React + Tailwind CSS.

## Run in 3 commands

```bash
# 1. Start all containers
docker compose up --build

# 2. Seed the database (new terminal, wait for backend to start)
docker compose exec backend python seed.py

# 3. Open the app
open http://localhost:3000
```

## Login credentials

| Role  | Email                    | Password   |
|-------|--------------------------|------------|
| Admin | admin@opsplatform.com    | admin1234  |
| Staff | alice@opsplatform.com    | staff1234  |
| Staff | bob@opsplatform.com      | staff1234  |

## API docs

http://localhost:8000/docs

## Ports

| Service   | Port |
|-----------|------|
| Frontend  | 3000 |
| Backend   | 8000 |
| Postgres  | 5432 |
| Redis     | 6379 |

## Stop

```bash
docker compose down            # stop containers
docker compose down -v         # stop + delete database volumes
```
