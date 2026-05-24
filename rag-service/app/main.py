import app.patch_forward_ref
import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Response, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from app.database import init_db, get_db_context
from app.events.cv_uploaded_consumer import start_cv_uploaded_consumer
from app.events.connection import close_rabbitmq, is_connected
from app.routers import documents
from app.utils.logger import logger, correlation_id_var

START_TIME = time.time()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting RAG & Document Service...")
    await init_db()
    
    try:
        await start_cv_uploaded_consumer()
    except Exception as e:
        logger.error(f"Failed to start RabbitMQ consumer: {str(e)}")
        
    yield
    
    # Shutdown
    logger.info("Shutting down RAG & Document Service...")
    await close_rabbitmq()

import os
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator

app = FastAPI(
    title="RAG & Document Service", 
    version="1.0.0",
    lifespan=lifespan
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


# Centralized handler for HTTPExceptions (including Starlette's and FastAPI's subclasses)
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
                "details": None
            }
        }
    )

# Centralized handler for validation errors
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={
            "success": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Validation failed for request parameters",
                "details": exc.errors()
            }
        }
    )

# Centralized handler for all other unhandled exceptions
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
                "details": None
            }
        }
    )

# Include routers
app.include_router(documents.router)

@app.get("/health")
async def health_check(response: Response):
    """Health check endpoint — required by Docker Compose healthcheck."""
    db_status = "unhealthy"
    try:
        async with get_db_context() as db:
            await db.execute("SELECT 1")
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
            "service": "rag-service",
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
            "message": "RAG & Document Service — running."
        }
    }

# Instrument with Prometheus and expose /metrics
Instrumentator().instrument(app).expose(app, endpoint="/metrics")

