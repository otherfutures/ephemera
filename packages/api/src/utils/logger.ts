type LogLevel = 'info' | 'warn' | 'error' | 'success' | 'debug';

const colors = {
  info: '\x1b[36m',    // Cyan
  warn: '\x1b[33m',    // Yellow
  error: '\x1b[31m',   // Red
  success: '\x1b[32m', // Green
  debug: '\x1b[90m',   // Gray
  reset: '\x1b[0m',
};

function formatTimestamp(): string {
  return new Date().toISOString();
}

function log(level: LogLevel, message: string, ...args: any[]) {
  const color = colors[level];
  const timestamp = formatTimestamp();
  const prefix = `${color}[${level.toUpperCase()}]${colors.reset} ${timestamp}`;

  console.log(`${prefix} ${message}`, ...args);
}

export const logger = {
  info: (message: string, ...args: any[]) => log('info', message, ...args),
  warn: (message: string, ...args: any[]) => log('warn', message, ...args),
  error: (message: string, ...args: any[]) => log('error', message, ...args),
  success: (message: string, ...args: any[]) => log('success', message, ...args),
  debug: (message: string, ...args: any[]) => log('debug', message, ...args),
};
