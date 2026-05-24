import json
import aio_pika
from app.events.connection import get_channel
from app.utils.logger import logger

async def publish_cv_ready(
    application_id: str,
    status: str,
    chunk_count: int,
    extracted_email: str | None,
    extracted_name: str | None,
    correlation_id: str
):
    """
    Publishes CV_READY event to RabbitMQ.
    """
    channel = await get_channel()
    exchange_name = "cv.events"
    routing_key = "cv.ready"
    
    # Declare exchange dynamically
    exchange = await channel.declare_exchange(
        exchange_name, 
        aio_pika.ExchangeType.DIRECT, 
        durable=True
    )
    
    payload = {
        "application_id": application_id,
        "status": status,
        "chunk_count": chunk_count,
        "extracted_email": extracted_email,
        "extracted_name": extracted_name,
        "correlation_id": correlation_id
    }
    
    message = aio_pika.Message(
        body=json.dumps(payload).encode(),
        content_type="application/json",
        delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
    )
    
    await exchange.publish(message, routing_key=routing_key)
    logger.info(
        f"Published event.cv_ready", 
        correlation_id=correlation_id,
        application_id=application_id,
        status=status
    )
