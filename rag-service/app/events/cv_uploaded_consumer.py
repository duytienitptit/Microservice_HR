import json
import asyncio
import aio_pika
from app.events.connection import get_channel
from app.services.document_service import process_cv
from app.utils.logger import logger, correlation_id_var

async def attempt_with_retry(action_fn, correlation_id: str, action_name: str):
    attempts = 0
    max_attempts = 3
    backoff_delays = [5.0, 15.0, 45.0] # 5s, 15s, 45s
    
    while attempts < max_attempts:
        try:
            attempts += 1
            await action_fn()
            return
        except Exception as err:
            logger.warning(
                f"{action_name} attempt {attempts} failed: {str(err)}",
                correlation_id=correlation_id
            )
            if attempts >= max_attempts:
                raise err
            delay = backoff_delays[attempts - 1]
            logger.info(
                f"{action_name} retrying in {delay}s (next attempt {attempts + 1})",
                correlation_id=correlation_id
            )
            await asyncio.sleep(delay)

async def handle_cv_uploaded(payload: dict):
    application_id = payload.get("application_id")
    cv_file_path = payload.get("cv_file_path")
    correlation_id = payload.get("correlation_id") or "unknown"
    
    if not application_id or not cv_file_path:
        logger.error(
            "Missing application_id or cv_file_path in CV_UPLOADED payload", 
            payload=payload, 
            correlation_id=correlation_id
        )
        return
        
    async def run_process():
        await process_cv(application_id, cv_file_path, correlation_id)
        
    await attempt_with_retry(run_process, correlation_id, "cv_processing")

async def start_cv_uploaded_consumer():
    """
    Declares exchange, queue, binds them, and starts consuming CV_UPLOADED events.
    """
    logger.info("Initializing RabbitMQ CV_UPLOADED consumer...")
    channel = await get_channel()
    
    exchange_name = "cv.events"
    queue_name = "cv.uploaded"
    routing_key = "cv.uploaded"
    dlx_exchange_name = "dlx.events"
    dlq_name = "dlq.cv.uploaded"
    
    # 1. Declare exchanges
    exchange = await channel.declare_exchange(
        exchange_name, 
        aio_pika.ExchangeType.DIRECT, 
        durable=True
    )
    
    dlx = await channel.declare_exchange(
        dlx_exchange_name,
        aio_pika.ExchangeType.DIRECT,
        durable=True
    )
    
    # 2. Declare DLQ and bind to DLX
    dlq = await channel.declare_queue(dlq_name, durable=True)
    await dlq.bind(dlx, routing_key=routing_key)
    
    # 3. Declare CV queue with DLX and TTL arguments, and bind to exchange
    queue = await channel.declare_queue(
        queue_name,
        durable=True,
        arguments={
            "x-dead-letter-exchange": dlx_exchange_name,
            "x-message-ttl": 60000,
        }
    )
    await queue.bind(exchange, routing_key=routing_key)
    
    # 4. Define incoming message processor
    async def on_message(message: aio_pika.IncomingMessage):
        async with message.process(requeue=False):
            try:
                body = message.body.decode()
                payload = json.loads(body)
                
                correlation_id = payload.get("correlation_id") or "unknown"
                token = correlation_id_var.set(correlation_id)
                
                logger.info(
                    f"Received event.cv_uploaded", 
                    correlation_id=correlation_id,
                    application_id=payload.get("application_id")
                )
                
                try:
                    await handle_cv_uploaded(payload)
                finally:
                    correlation_id_var.reset(token)
                    
            except Exception as e:
                logger.error(f"Error processing CV_UPLOADED message: {str(e)}")
                raise # Raise to trigger nack & send to DLQ
                
    await queue.consume(on_message)
    logger.info(f"Started consuming messages on queue '{queue_name}'")
