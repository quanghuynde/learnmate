const Redis = require('ioredis');

let connection = null;
let isRedisAvailable = false;

const redisConfig = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
  enableOfflineQueue: false,
  lazyConnect: true, // Don't connect immediately
  retryStrategy: (times) => {
    // Only retry 3 times on startup, then give up gracefully
    if (times > 3) return null;
    return Math.min(times * 500, 2000);
  }
};

try {
  connection = new Redis(redisConfig);

  connection.on('connect', () => {
    isRedisAvailable = true;
    console.log('✅ Redis connected. Background jobs are active.');
  });

  connection.on('error', (err) => {
    if (isRedisAvailable) {
      console.warn('⚠️ Redis error:', err.message);
    }
    isRedisAvailable = false;
  });

  connection.on('close', () => {
    isRedisAvailable = false;
  });

  // Try to connect once; if it fails, we just skip
  connection.connect().catch(() => {
    console.warn('⚠️ Redis not available. Background document processing is disabled.');
    isRedisAvailable = false;
  });

} catch (err) {
  console.warn('⚠️ Redis client could not be created:', err.message);
}

module.exports = {
  connection,
  redisConfig,
  isRedisAvailable: () => isRedisAvailable
};
