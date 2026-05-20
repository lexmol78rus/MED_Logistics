import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  API_PREFIX: Joi.string().default('api/v1'),
  DATABASE_URL: Joi.string().required(),
  JWT_ACCESS_SECRET: Joi.when('NODE_ENV', {
    is: Joi.valid('production'),
    then: Joi.string().min(32).required(),
    otherwise: Joi.string().min(8).required(),
  }),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_SECRET: Joi.when('NODE_ENV', {
    is: Joi.valid('production'),
    then: Joi.string().min(32).required(),
    otherwise: Joi.string().min(8).required(),
  }),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
  LOG_LEVEL: Joi.string()
    .valid('trace', 'debug', 'info', 'warn', 'error', 'fatal')
    .default('info'),
  THROTTLE_TTL: Joi.number().positive().default(60),
  THROTTLE_LIMIT: Joi.number().positive().default(100),
  THROTTLE_FORGOT_PASSWORD_LIMIT: Joi.number().positive().default(5),
  APP_URL: Joi.string().uri().default('http://localhost'),
  SMTP_HOST: Joi.string().allow('').default(''),
  SMTP_PORT: Joi.number().port().default(465),
  SMTP_USER: Joi.string().allow('').default(''),
  SMTP_PASSWORD: Joi.string().allow('').default(''),
  SMTP_FROM: Joi.string().allow('').default(''),
  SETTINGS_ENCRYPTION_KEY: Joi.when('NODE_ENV', {
    is: Joi.valid('production'),
    then: Joi.string().min(32).required(),
    otherwise: Joi.string().min(8).default(''),
  }),
});
