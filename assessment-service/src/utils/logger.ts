import winston from 'winston';
import fs from 'fs';
import path from 'path';

const transports: winston.transport[] = [
  new winston.transports.Console()
];

const logDir = '/var/log/app';
if (fs.existsSync(logDir)) {
  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, 'assessment-service.log')
    })
  );
}

const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'assessment-service' },
  transports,
});

export default logger;
