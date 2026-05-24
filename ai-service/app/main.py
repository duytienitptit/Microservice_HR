import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Response, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from app.database import init_db, engine
from app.events.connection import connect_rabbitmq, close_rabbitmq, is_connected
from app.routers import interviews
from app.utils.logger import logger, correlation_id_var

START_TIME = time.time()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ─── Startup ────────────────────────────────────────────
    logger.info("Starting AI Interviewer Service...")
    await init_db()

    try:
        await connect_rabbitmq()
    except Exception as e:
        logger.error(f"Failed to connect RabbitMQ on startup: {str(e)}")

    yield

    # ─── Shutdown ───────────────────────────────────────────
    logger.info("Shutting down AI Interviewer Service...")
    await close_rabbitmq()
    await engine.dispose()


import os
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator
from prometheus_client import Gauge
from sqlalchemy import select, func
from app.models.interview_session import InterviewSession, InterviewStatus
from app.database import get_db

app = FastAPI(
    title="AI Interviewer Service",
    version="1.0.0",
    lifespan=lifespan,
)

frontend_url = os.getenv("FRONTEND_URL", "http://localhost")
allowed_origins = [
    frontend_url,
    "http://localhost",
    "https://localhost",
    "http://localhost:3000",
    "http://localhost:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Correlation ID & Security Headers Middleware ──────────────────


@app.middleware("http")
async def correlation_id_and_security_middleware(request: Request, call_next):
    correlation_id = request.headers.get("x-correlation-id", "")
    correlation_id_var.set(correlation_id)

    logger.info(
        "http.request",
        correlation_id=correlation_id,
        method=request.method,
        path=request.url.path,
    )

    response = await call_next(request)
    if correlation_id:
        response.headers["X-Correlation-ID"] = correlation_id
    
    # Add Security Headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    return response


# ─── Exception Handlers ───────────────────────────────────


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    code = "HTTP_ERROR"
    message = str(exc.detail)
    if isinstance(exc.detail, dict):
        code = exc.detail.get("code", "HTTP_ERROR")
        message = exc.detail.get("message", str(exc.detail))

    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {
                "code": code,
                "message": message,
                "details": None,
            },
        },
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={
            "success": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Validation failed for request parameters",
                "details": exc.errors(),
            },
        },
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    correlation_id = correlation_id_var.get()
    logger.exception(f"Unhandled exception occurred", correlation_id=correlation_id)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": str(exc),
                "details": None,
            },
        },
    )


# ─── Include Routers ──────────────────────────────────────

app.include_router(interviews.router)


# ─── Health Check ──────────────────────────────────────────


@app.get("/health")
async def health_check(response: Response):
    """Health check endpoint — required by Docker Compose healthcheck."""
    db_status = "unhealthy"
    try:
        async with engine.connect() as conn:
            await conn.execute(
                __import__("sqlalchemy").text("SELECT 1")
            )
        db_status = "connected"
    except Exception as e:
        logger.error(f"Healthcheck database check failed: {str(e)}")

    rabbitmq_status = "connected" if is_connected() else "disconnected"

    is_healthy = db_status == "connected" and rabbitmq_status == "connected"

    if not is_healthy:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE

    return {
        "success": True,
        "data": {
            "status": "healthy" if is_healthy else "unhealthy",
            "service": "ai-service",
            "version": "1.0.0",
            "db": db_status,
            "rabbitmq": rabbitmq_status,
            "uptime_seconds": int(time.time() - START_TIME),
        },
    }


@app.get("/")
def root():
    return {
        "success": True,
        "data": {
            "message": "AI Interviewer Service — running.",
        },
    }


# ─── Prometheus Metrics ───────────────────────────────────

# Instrument the app to record requests
Instrumentator().instrument(app)

ACTIVE_SESSIONS = Gauge("active_sessions", "Number of active interview sessions in progress")

@app.get("/metrics")
async def metrics(request: Request):
    try:
        async for db in get_db():
            result = await db.execute(
                select(func.count(InterviewSession.id))
                .where(InterviewSession.status == InterviewStatus.IN_PROGRESS)
            )
            count = result.scalar() or 0
            ACTIVE_SESSIONS.set(count)
            break
    except Exception as e:
        logger.error(f"Failed to update active_sessions metric: {str(e)}")

    from prometheus_client import generate_latest, CONTENT_TYPE_LATEST
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)

