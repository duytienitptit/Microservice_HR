---
name: rabbitmq-integration
description: Provides patterns for RabbitMQ publisher/consumer implementation, connection management, retry logic, and DLQ setup. Use when coding event-driven features or message queue integrations.
---

# RabbitMQ Integration

## When to Use

- Implementing a new event publisher or consumer
- Setting up RabbitMQ connection management
- Adding retry logic or Dead Letter Queue
- Debugging message delivery issues

## Decision Tree

```
What are you doing?
├── Publishing an event → See Publisher Pattern
├── Consuming an event → See Consumer Pattern
├── Setting up connection → See Connection Management
└── Handling failures   → See Retry & DLQ
```

## CRITICAL: Read `event-contracts.md` first

Before writing any publisher/consumer, read `.agents/rules/event-contracts.md` for exact:
- Exchange names and types
- Queue names
- Payload shapes (DO NOT change)
- DLQ layout

## Connection Management (shared pattern)

### Node.js (amqplib)

```typescript
// src/events/connection.ts
import amqplib, { Connection, Channel } from 'amqplib';
import logger from '../utils/logger';

let connection: Connection | null = null;
let channel: Channel | null = null;

export async function connectRabbitMQ(url: string): Promise<Channel> {
  if (channel) return channel;

  connection = await amqplib.connect(url);
  channel = await connection.createChannel();

  connection.on('close', () => {
    logger.warn({ event: 'rabbitmq.connection.closed' });
    channel = null;
    connection = null;
    setTimeout(() => connectRabbitMQ(url), 5000); // Reconnect
  });

  logger.info({ event: 'rabbitmq.connected' });
  return channel;
}

export function getChannel(): Channel {
  if (!channel) throw new Error('RabbitMQ channel not initialized');
  return channel;
}
```

### Python (aio-pika)

```python
# app/events/connection.py
import aio_pika
from app.config import settings
from app.utils.logger import logger

_connection = None
_channel = None

async def connect_rabbitmq():
    global _connection, _channel
    _connection = await aio_pika.connect_robust(settings.RABBITMQ_URL)
    _channel = await _connection.channel()
    logger.info("RabbitMQ connected")
    return _channel

async def get_channel():
    if _channel is None or _channel.is_closed:
        return await connect_rabbitmq()
    return _channel
```

## Publisher Pattern

### Node.js

```typescript
// src/events/publisher.ts
import { getChannel } from './connection';
import logger from '../utils/logger';

export async function publishEvent(
  exchange: string,
  routingKey: string,
  payload: Record<string, unknown>,
  correlationId: string
): Promise<void> {
  const channel = getChannel();
  await channel.assertExchange(exchange, 'direct', { durable: true });

  const message = { ...payload, correlation_id: correlationId };

  channel.publish(exchange, routingKey, Buffer.from(JSON.stringify(message)), {
    persistent: true,
    contentType: 'application/json',
  });

  logger.info({ event: `event.published.${routingKey}`, correlation_id: correlationId });
}
```

### Python

```python
# app/events/publisher.py
import json
import aio_pika
from app.events.connection import get_channel
from app.utils.logger import logger

async def publish_event(exchange_name: str, routing_key: str, payload: dict, correlation_id: str):
    channel = await get_channel()
    exchange = await channel.declare_exchange(exchange_name, aio_pika.ExchangeType.DIRECT, durable=True)

    message = aio_pika.Message(
        body=json.dumps({**payload, "correlation_id": correlation_id}).encode(),
        content_type="application/json",
        delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
    )

    await exchange.publish(message, routing_key=routing_key)
    logger.info(f"Published {routing_key}", correlation_id=correlation_id)
```

## Consumer Pattern

### Node.js

```typescript
// src/events/consumer.ts
import { getChannel } from './connection';
import logger from '../utils/logger';

export async function consumeEvent(
  exchange: string,
  queue: string,
  routingKey: string,
  handler: (payload: any) => Promise<void>
): Promise<void> {
  const channel = getChannel();
  await channel.assertExchange(exchange, 'direct', { durable: true });
  await channel.assertQueue(queue, {
    durable: true,
    arguments: {
      'x-dead-letter-exchange': 'dlx.events',
      'x-message-ttl': 60000,
    },
  });
  await channel.bindQueue(queue, exchange, routingKey);

  channel.consume(queue, async (msg) => {
    if (!msg) return;
    try {
      const payload = JSON.parse(msg.content.toString());
      logger.info({ event: `event.received.${routingKey}`, correlation_id: payload.correlation_id });
      await handler(payload);
      channel.ack(msg);
    } catch (error) {
      logger.error({ event: `event.failed.${routingKey}`, error: (error as Error).message });
      channel.nack(msg, false, false); // Send to DLQ
    }
  });
}
```

### Python

```python
# app/events/consumer.py
import json
import aio_pika
from app.events.connection import get_channel
from app.utils.logger import logger

async def consume_event(exchange_name: str, queue_name: str, routing_key: str, handler):
    channel = await get_channel()
    exchange = await channel.declare_exchange(exchange_name, aio_pika.ExchangeType.DIRECT, durable=True)
    queue = await channel.declare_queue(queue_name, durable=True, arguments={
        "x-dead-letter-exchange": "dlx.events",
        "x-message-ttl": 60000,
    })
    await queue.bind(exchange, routing_key=routing_key)

    async def on_message(message: aio_pika.IncomingMessage):
        async with message.process(requeue=False):
            try:
                payload = json.loads(message.body.decode())
                logger.info(f"Received {routing_key}", correlation_id=payload.get("correlation_id"))
                await handler(payload)
            except Exception as e:
                logger.error(f"Failed {routing_key}: {e}")
                raise  # Will nack and send to DLQ

    await queue.consume(on_message)
```

## Event Quick Reference

| Event | Exchange | Queue | Publisher | Consumer |
|-------|----------|-------|-----------|----------|
| CV_UPLOADED | cv.events | cv.uploaded | Core | RAG |
| CV_READY | cv.events | cv.ready | RAG | Core |
| INTERVIEW_COMPLETED | interview.events | interview.completed | AI | Assessment |
| SEND_EMAIL | notification.events | send.email | Assessment | Assessment |
