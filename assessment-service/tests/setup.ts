// Setup test environment variables before any module is loaded
process.env.NODE_ENV = 'test';
process.env.MONGODB_URL = 'mongodb://localhost:27017/test_assessment_db';
process.env.JWT_SECRET = 'test-jwt-secret-for-unit-tests';
process.env.RABBITMQ_URL = 'amqp://localhost:5672';
process.env.CORE_SERVICE_URL = 'http://localhost:3001';
process.env.PORT = '3004';
