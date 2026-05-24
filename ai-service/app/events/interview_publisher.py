import json
import aio_pika
from app.events.connection import get_channel
from app.utils.logger import logger


async def publish_interview_completed(
    session_id: str,
    application_id: str,
    chat_history: list[dict],
    correlation_id: str,
):
    """
    Publishes INTERVIEW_COMPLETED event to RabbitMQ.

    Event contract:
    - Exchange: interview.events (direct)
    - Routing key: interview.completed
    - Queue: interview.completed (bound by consumer — Assessment Service)
    """
    channel = await get_channel()
    exchange_name = "interview.events"
    routing_key = "interview.completed"

    # Declare exchange dynamically
    exchange = await channel.declare_exchange(
        exchange_name,
        aio_pika.ExchangeType.DIRECT,
        durable=True,
    )

    payload = {
        "session_id": session_id,
        "application_id": application_id,
        "chat_history": chat_history,
        "correlation_id": correlation_id,
    }

    message = aio_pika.Message(
        body=json.dumps(payload).encode(),
        content_type="application/json",
        delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
    )

    await exchange.publish(message, routing_key=routing_key)
    logger.info(
        "Published event.interview_completed",
        correlation_id=correlation_id,
        session_id=session_id,
        application_id=application_id,
    )
