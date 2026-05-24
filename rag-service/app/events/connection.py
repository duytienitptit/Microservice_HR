import aio_pika
from app.config import settings
from app.utils.logger import logger

_connection = None
_channel = None

async def connect_rabbitmq():
    global _connection, _channel
    logger.info(f"Connecting to RabbitMQ at {settings.RABBITMQ_URL}")
    _connection = await aio_pika.connect_robust(settings.RABBITMQ_URL)
    _channel = await _connection.channel()
    logger.info("RabbitMQ connected successfully")
    return _channel

async def get_channel():
    global _channel
    if _channel is None or _channel.is_closed:
        return await connect_rabbitmq()
    return _channel

async def close_rabbitmq():
    global _connection, _channel
    logger.info("Closing RabbitMQ connection...")
    if _channel and not _channel.is_closed:
        await _channel.close()
    if _connection and not _connection.is_closed:
        await _connection.close()
    _channel = None
    _connection = None
    logger.info("RabbitMQ connection closed")

def is_connected() -> bool:
    global _connection, _channel
    if _connection is None or _connection.is_closed:
        return False
    if _channel is None or _channel.is_closed:
        return False
    return True
