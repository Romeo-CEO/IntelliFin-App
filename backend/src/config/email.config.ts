import { registerAs } from '@nestjs/config';

export const emailConfig = registerAs('email', () => ({
  smtp: {
    host: process.env.SMTP_HOST || 'localhost',
    port: parseInt(process.env.SMTP_PORT || '1025', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  },
  from: {
    email: process.env.SMTP_FROM_EMAIL || 'noreply@intellifin.com',
    name: process.env.SMTP_FROM_NAME || 'IntelliFin',
  },
  templates: {
    path: process.env.EMAIL_TEMPLATES_PATH || './src/templates/email',
    engine: process.env.EMAIL_TEMPLATE_ENGINE || 'handlebars',
  },
  queue: {
    enabled: process.env.EMAIL_QUEUE_ENABLED === 'true',
    attempts: parseInt(process.env.EMAIL_QUEUE_ATTEMPTS || '3', 10),
    delay: parseInt(process.env.EMAIL_QUEUE_DELAY || '5000', 10),
  },
}));
