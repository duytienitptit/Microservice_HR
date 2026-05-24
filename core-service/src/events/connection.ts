import amqplib, { ChannelModel, Channel } from 'amqplib';
import logger from '../utils/logger';
import { config } from '../config';

let connection: ChannelModel | null = null;
let channel: Channel | null = null;
let isConnecting = false;

export async function connectRabbitMQ(url: string = config.rabbitmq.url): Promise<Channel> {
  if (channel) return channel;
  
  if (isConnecting) {
    // Wait for connection to be established by another call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    if (channel) return channel;
  }
  
  isConnecting = true;
  try {
    logger.info({ event: 'rabbitmq.connecting', url });
    const activeConnection = await amqplib.connect(url);
    connection = activeConnection;
    
    const activeChannel = await activeConnection.createChannel();
    channel = activeChannel;

    // Assert exchanges
    await activeChannel.assertExchange('cv.events', 'direct', { durable: true });
    await activeChannel.assertExchange('notification.events', 'direct', { durable: true });
    await activeChannel.assertExchange('dlx.events', 'direct', { durable: true });

    // Assert DLQs
    await activeChannel.assertQueue('dlq.cv.uploaded', { durable: true });
    await activeChannel.assertQueue('dlq.send.email', { durable: true });
    await activeChannel.assertQueue('dlq.cv.ready', { durable: true });

    // Bind DLQs to DLX using original routing keys
    await activeChannel.bindQueue('dlq.cv.uploaded', 'dlx.events', 'cv.uploaded');
    await activeChannel.bindQueue('dlq.send.email', 'dlx.events', 'send.email');
    await activeChannel.bindQueue('dlq.cv.ready', 'dlx.events', 'cv.ready');

    // Assert and bind main queues
    await activeChannel.assertQueue('cv.uploaded', {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': 'dlx.events',
        'x-message-ttl': 60000,
      },
    });
    await activeChannel.bindQueue('cv.uploaded', 'cv.events', 'cv.uploaded');

    await activeChannel.assertQueue('cv.ready', {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': 'dlx.events',
        'x-message-ttl': 60000,
      },
    });
    await activeChannel.bindQueue('cv.ready', 'cv.events', 'cv.ready');

    await activeChannel.assertQueue('send.email', {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': 'dlx.events',
        'x-message-ttl': 60000,
      },
    });
    await activeChannel.bindQueue('send.email', 'notification.events', 'send.email');

    activeConnection.on('close', () => {
      logger.warn({ event: 'rabbitmq.connection.closed' });
      channel = null;
      connection = null;
      setTimeout(() => connectRabbitMQ(url), 5000); // Reconnect
    });

    activeConnection.on('error', (err) => {
      logger.error({ event: 'rabbitmq.connection.error', error: err.message });
    });

    logger.info({ event: 'rabbitmq.connected' });
    isConnecting = false;
    return activeChannel;
  } catch (err) {
    logger.error({
      event: 'rabbitmq.connection_failed',
      message: err instanceof Error ? err.message : String(err),
    });
    isConnecting = false;
    // Retry connection after 5 seconds
    await new Promise((resolve) => setTimeout(resolve, 5000));
    return connectRabbitMQ(url);
  }
}

export function getChannel(): Channel {
  if (!channel) throw new Error('RabbitMQ channel not initialized');
  return channel;
}

export async function closeRabbitMQ(): Promise<void> {
  try {
    if (channel) {
      await channel.close();
      channel = null;
    }
    if (connection) {
      await connection.close();
      connection = null;
    }
    logger.info({ event: 'rabbitmq.closed' });
  } catch (err) {
    logger.error({
      event: 'rabbitmq.close_failed',
      message: err instanceof Error ? err.message : String(err),
    });
  }
}
