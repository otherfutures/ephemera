import 'dotenv/config';
import { serve } from '@hono/node-server';
import { OpenAPIHono } from '@hono/zod-openapi';
import { swaggerUI } from '@hono/swagger-ui';
import { cors } from 'hono/cors';
import { logger as honoLogger } from 'hono/logger';
import { initializeDatabase } from './db/index.js';
import { logger } from './utils/logger.js';
import { searchCacheManager } from './services/search-cache.js';
import { appSettingsService } from './services/app-settings.js';
import { bookloreSettingsService } from './services/booklore-settings.js';
import { bookloreTokenRefresher } from './services/booklore-token-refresher.js';
import { bookCleanupService } from './services/book-cleanup.js';
import searchRoutes from './routes/search.js';
import downloadRoutes from './routes/download.js';
import queueRoutes from './routes/queue.js';
import bookloreRoutes from './routes/booklore.js';
import settingsRoutes from './routes/settings.js';
import imageProxyRoutes from './routes/image-proxy.js';

// Filter out undici socket errors from stderr
const originalStderrWrite = process.stderr.write.bind(process.stderr);
process.stderr.write = ((chunk: any, encoding?: any, callback?: any): boolean => {
  const output = chunk.toString();
  // Filter out known network errors from AA
  if (output.includes('TypeError: terminated') ||
      output.includes('SocketError: other side closed') ||
      output.includes('UND_ERR_SOCKET')) {
    // Silently ignore these errors
    if (typeof encoding === 'function') {
      encoding();
    } else if (callback) {
      callback();
    }
    return true;
  }
  return originalStderrWrite(chunk, encoding, callback);
}) as typeof process.stderr.write;

// Initialize database
await initializeDatabase();

// Initialize app settings with defaults
await appSettingsService.initializeDefaults();

// Initialize Booklore settings with defaults
await bookloreSettingsService.initializeDefaults();

// Start Booklore token refresher service
bookloreTokenRefresher.start();

// Cleanup expired cache on startup
const cleanedUp = await searchCacheManager.cleanup();
if (cleanedUp > 0) {
  logger.info(`Cleaned up ${cleanedUp} expired cache entries`);
}

// Create Hono app with OpenAPI
const app = new OpenAPIHono();

// Middleware
// Custom logger that skips certain requests to reduce log spam
app.use('*', async (c, next) => {
  // Skip logging for image proxy and queue requests
  if (c.req.path.includes('/proxy/image') || c.req.path === '/api/queue') {
    return next();
  }
  // Use hono logger for all other requests
  return honoLogger()(c, next);
});
app.use('*', cors());

// Error handling middleware
app.onError((err, c) => {
  logger.error('Unhandled error:', err);

  return c.json(
    {
      error: 'Internal server error',
      message: err.message,
    },
    500
  );
});

// Root endpoint
app.get('/', (c) => {
  return c.json({
    name: 'Ephemera API',
    version: '1.0.0',
    description: 'API for searching and downloading books from AA',
    endpoints: {
      search: '/api/search',
      download: '/api/download/:md5',
      queue: '/api/queue',
      history: '/api/history',
      stats: '/api/stats',
      settings: '/api/settings',
      booklore: '/api/booklore/*',
      imageProxy: '/api/proxy/image',
      docs: '/api/docs',
      openapi: '/api/openapi.json',
    },
  });
});

// Mount API routes
app.route('/api', searchRoutes);
app.route('/api', downloadRoutes);
app.route('/api', queueRoutes);
app.route('/api', settingsRoutes);
app.route('/api', bookloreRoutes);
app.route('/api', imageProxyRoutes);

// OpenAPI documentation
app.doc('/api/openapi.json', {
  openapi: '3.1.0',
  info: {
    title: 'Ephemera API',
    version: '1.0.0',
    description: 'API for searching and downloading books from AA',
    contact: {
      name: 'API Support',
    },
  },
  servers: [
    {
      url: `http://localhost:${process.env.PORT || 3000}`,
      description: 'Local development server',
    },
  ],
  tags: [
    {
      name: 'Search',
      description: 'Search for books',
    },
    {
      name: 'Download',
      description: 'Queue and manage downloads',
    },
    {
      name: 'Queue',
      description: 'Monitor download queue and history',
    },
    {
      name: 'Settings',
      description: 'Application settings and configuration',
    },
    {
      name: 'Booklore',
      description: 'Optional Booklore integration for uploading books to your library',
    },
    {
      name: 'Image Proxy',
      description: 'Proxy images from AA to protect client IP addresses',
    },
  ],
});

// Swagger UI
app.get('/api/docs', swaggerUI({ url: '/api/openapi.json' }));

// Health check
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Cleanup cache periodically (every hour)
setInterval(async () => {
  try {
    const cleaned = await searchCacheManager.cleanup();
    if (cleaned > 0) {
      logger.info(`Cleaned up ${cleaned} expired cache entries`);
    }
  } catch (error) {
    logger.error('Failed to cleanup cache:', error);
  }
}, 60 * 60 * 1000);

// Cleanup old books and downloads periodically (every 24 hours)
setInterval(async () => {
  try {
    const cleaned = await bookCleanupService.cleanupAll();
    const total = cleaned.books + cleaned.downloads;
    if (total > 0) {
      logger.info(`Cleaned up ${cleaned.books} old books and ${cleaned.downloads} old downloads from database`);
    }
  } catch (error) {
    logger.error('Failed to cleanup old data:', error);
  }
}, 24 * 60 * 60 * 1000);

// Start server
const port = parseInt(process.env.PORT || '3000');
const host = process.env.HOST || '0.0.0.0';

logger.success(`
╔═══════════════════════════════════════════════════╗
║                                                   ║
║   Ephemera API is running!                        ║
║                                                   ║
║   API:     http://${host}:${port}/api                ║
║   Docs:    http://${host}:${port}/api/docs           ║
║   Health:  http://${host}:${port}/health             ║
║                                                   ║
╚═══════════════════════════════════════════════════╝
`);

const server = serve({
  fetch: app.fetch,
  port,
  hostname: host,
});

// Graceful shutdown
const shutdown = async (signal: string) => {
  logger.info(`Received ${signal}, shutting down gracefully...`);

  try {
    // Stop background services
    bookloreTokenRefresher.stop();

    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });

    // Force exit after 5 seconds
    setTimeout(() => {
      logger.warn('Forcing shutdown after timeout');
      process.exit(1);
    }, 5000);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle unhandled promise rejections (e.g., socket errors from AA)
process.on('unhandledRejection', (reason, promise) => {
  // Only log non-network errors
  const errorMessage = String(reason);
  const isNetworkError = errorMessage.includes('terminated') ||
                        errorMessage.includes('socket') ||
                        errorMessage.includes('UND_ERR_SOCKET') ||
                        errorMessage.includes('ECONNREFUSED');

  if (!isNetworkError) {
    logger.error('Unhandled rejection:', reason);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  // Don't exit on network errors
  const isNetworkError = error.message?.includes('terminated') ||
                        error.message?.includes('socket') ||
                        error.message?.includes('UND_ERR_SOCKET');

  if (!isNetworkError) {
    process.exit(1);
  }
});
