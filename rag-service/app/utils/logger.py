import sys
import json
import traceback
from datetime import datetime, timezone
import contextvars
from loguru import logger

# Contextvar to store the correlation ID for the current context (task/request)
correlation_id_var = contextvars.ContextVar("correlation_id", default="unknown")

def json_sink(message):
    record = message.record
    extra = record.get("extra", {})
    
    # Extract correlation_id from contextvar or extra
    correlation_id = extra.get("correlation_id") or correlation_id_var.get()
    
    # Build standard envelope
    log_record = {
        "timestamp": record["time"].isoformat() if "time" in record else datetime.now(timezone.utc).isoformat(),
        "level": record["level"].name.lower(),
        "service": "rag-service",
        "correlation_id": correlation_id,
        "event": record["message"]
    }
    
    # Add exception info if present
    if record.get("exception"):
        exc_type, exc_value, exc_traceback = record["exception"]
        log_record["exception"] = {
            "type": exc_type.__name__ if exc_type else "Exception",
            "value": str(exc_value),
            "traceback": "".join(traceback.format_exception(exc_type, exc_value, exc_traceback))
        }
    
    # Include any additional extra fields that were passed but avoid overriding standard fields
    for k, v in extra.items():
        if k not in log_record and k != "correlation_id":
            log_record[k] = v
            
    import os
    log_dir = "/var/log/app"
    log_line = json.dumps(log_record) + "\n"
    sys.stdout.write(log_line)
    sys.stdout.flush()

    if os.path.exists(log_dir):
        try:
            with open(os.path.join(log_dir, "rag-service.log"), "a") as f:
                f.write(log_line)
        except Exception:
            pass

# Remove standard handler and add our JSON sink
logger.remove()
logger.add(json_sink, level="INFO")
