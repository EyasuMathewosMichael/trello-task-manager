// Feature: trello-task-manager, Redis Client Module
import Redis from 'ioredis';

let client = null;

/**
 * Lazily initialise the Redis client on first use.
 * Using lazyConnect: true means ioredis will not attempt to connect until
 * the first command is issued, so the app starts cleanly even when Redis
 * is unavailable.
 */
function getClient() {
  if (!client) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    client = new Redis(redisUrl, {
      lazyConnect: true,
      // Suppress unhandled-rejection noise when Redis is down
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
    });

    client.on('error', (err) => {
      // Log but do NOT throw — the app must work without Redis
      console.error('Redis connection error:', err.message);
    });
  }
  return client;
}

/**
 * Retrieve a cached value by key.
 *
 * @param {string} key
 * @returns {Promise<any|null>} Parsed JSON value, or null on cache miss / error
 */
async function get(key) {
  try {
    const raw = await getClient().get(key);
    if (raw === null || raw === undefined) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Redis get error (key=${key}):`, err.message);
    return null;
  }
}

/**
 * Store a value in the cache with a TTL.
 *
 * @param {string} key
 * @param {any}    value       - Will be JSON-serialised
 * @param {number} ttlSeconds  - Expiry in seconds (EX option)
 * @returns {Promise<void>}
 */
async function set(key, value, ttlSeconds) {
  try {
    await getClient().set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch (err) {
    console.error(`Redis set error (key=${key}):`, err.message);
    // Silently fail — cache is best-effort
  }
}

/**
 * Delete a key from the cache.
 *
 * @param {string} key
 * @returns {Promise<void>}
 */
async function del(key) {
  try {
    await getClient().del(key);
  } catch (err) {
    console.error(`Redis del error (key=${key}):`, err.message);
    // Silently fail
  }
}

export { get, set, del };
