// Setup test environment variables before any module is loaded
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
process.env.JWT_SECRET = 'test-jwt-secret-for-unit-tests';
process.env.RABBITMQ_URL = 'amqp://localhost:5672';
process.env.NODE_ENV = 'test';
