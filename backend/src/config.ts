import 'dotenv/config';

const required = (key: string, value: string | undefined): string => {
  if (!value) throw new Error(`${key} is required (set it in .env or the host env)`);
  return value;
};

const num = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;
  const n = parseInt(value, 10);
  if (Number.isNaN(n)) throw new Error(`Expected integer, got: ${value}`);
  return n;
};

export const config = {
  env: process.env.NODE_ENV ?? 'development',
  port: num(process.env.PORT, 5000),

  db: {
    user: required('DB_USER', process.env.DB_USER),
    host: required('DB_HOST', process.env.DB_HOST),
    database: required('DB_NAME', process.env.DB_NAME),
    password: required('DB_PASSWORD', process.env.DB_PASSWORD),
    port: num(process.env.DB_PORT, 5432),
  },

  jwt: {
    secret: required('JWT_SECRET', process.env.JWT_SECRET),
    expiresIn: process.env.JWT_EXPIRES_IN ?? '20m',
    passwordSetupExpiresIn: process.env.JWT_PASSWORD_SETUP_EXPIRES_IN ?? '3d',
  },

  appBaseUrl: process.env.APP_BASE_URL ?? 'http://localhost:3000',

  email: {
    host: process.env.EMAIL_HOST,
    port: num(process.env.EMAIL_PORT, 587),
    secure: process.env.EMAIL_SECURE === 'true',
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASSWORD,
    from: process.env.EMAIL_FROM,
    debug: process.env.EMAIL_DEBUG === 'true',
  },

  maxUploadSize: num(process.env.MAX_UPLOAD_SIZE, 10 * 1024 * 1024),
} as const;

export type AppConfig = typeof config;
