/**
 * Centralized Security Logging Utility
 * 
 * Provides structured logging with proper log levels and PII protection.
 * All logs are JSON-formatted for easy parsing and analysis.
 * 
 * Security Guidelines:
 * - NEVER log email bodies or message content
 * - NEVER log passwords, API keys, or tokens
 * - Only log metadata: IDs, timestamps, IP addresses, event types
 * - Use appropriate log levels for filtering
 */

export type LogLevel = "info" | "warn" | "error" | "security";

export interface LogContext {
  userId?: string;
  ip?: string;
  emailId?: string;
  action?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Structured log entry format
 */
interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
}

/**
 * Internal logging function - formats and outputs to console
 */
function log(level: LogLevel, message: string, context?: LogContext): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(context && Object.keys(context).length > 0 ? { context } : {}),
  };

  // Use appropriate console method based on level
  switch (level) {
    case "error":
    case "security":
      console.error(JSON.stringify(entry));
      break;
    case "warn":
      console.warn(JSON.stringify(entry));
      break;
    case "info":
    default:
      console.log(JSON.stringify(entry));
      break;
  }
}

/**
 * Log informational messages (general operations)
 */
export function logInfo(message: string, context?: LogContext): void {
  log("info", message, context);
}

/**
 * Log warnings (potential issues, degraded functionality)
 */
export function logWarning(message: string, context?: LogContext): void {
  log("warn", message, context);
}

/**
 * Log errors (operational failures, exceptions)
 */
export function logError(message: string, context?: LogContext): void {
  log("error", message, context);
}

/**
 * Log security events (authentication, authorization, suspicious activity)
 * 
 * Examples:
 * - Authentication failures
 * - Invalid signatures
 * - Rate limit violations
 * - Unauthorized access attempts
 * - Multiple signup attempts
 */
export function logSecurity(message: string, context?: LogContext): void {
  log("security", message, context);
}

/**
 * Helper to redact sensitive data from objects
 * Removes common sensitive fields before logging
 */
export function redactSensitive<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const sensitiveFields = [
    "password",
    "token",
    "apiKey",
    "secret",
    "authorization",
    "body",
    "html",
    "text",
    "content",
  ];

  const redacted = { ...obj };
  for (const field of sensitiveFields) {
    if (field in redacted) {
      delete redacted[field];
    }
  }
  return redacted;
}
