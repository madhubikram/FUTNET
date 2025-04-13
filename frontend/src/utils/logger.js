/**
 * Simple logger utility for the application
 * Levels: INFO, WARNING, ERROR, DEBUG
 */

// Enable/disable logging based on environment
const isProduction = import.meta.env.PROD;
const DEFAULT_LOG_LEVEL = isProduction ? 'WARNING' : 'INFO';

/**
 * Logs a message with the specified level and context
 * @param {string} level - Log level (INFO, WARNING, ERROR, DEBUG)
 * @param {string} context - The context where the log originates
 * @param {string} message - The message to log
 * @param {Object} [data] - Optional data to include in the log
 */
export const log = (level = DEFAULT_LOG_LEVEL, context = 'APP', message, data) => {
  // Skip DEBUG logs in production
  if (isProduction && level === 'DEBUG') {
    return;
  }
  
  const timestamp = new Date().toISOString();
  const formattedMessage = `[${timestamp}] [${level}] [${context}]: ${message}`;
  
  switch (level) {
    case 'ERROR':
      console.error(formattedMessage, data || '');
      break;
    case 'WARNING':
      console.warn(formattedMessage, data || '');
      break;
    case 'DEBUG':
      console.debug(formattedMessage, data || '');
      break;
    case 'INFO':
    default:
      console.log(formattedMessage, data || '');
      break;
  }
};

export default {
  log
}; 