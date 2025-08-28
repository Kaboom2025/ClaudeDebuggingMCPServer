import { EventEmitter } from 'events';

export enum LogCategory {
  SESSION = 'session',           // Session lifecycle
  BREAKPOINT = 'breakpoint',     // Breakpoint operations  
  EXECUTION = 'execution',       // Step, continue, pause
  INSPECTION = 'inspection',     // Variable/expression evaluation
  PROGRAM_OUTPUT = 'output',     // Python stdout/stderr
  PROGRAM_ERROR = 'error',       // Python exceptions/errors
  CLAUDE_ACTION = 'claude',      // Claude-initiated actions
  USER_ACTION = 'user',          // User-initiated actions
  SYSTEM = 'system'              // Internal system events
}

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export interface DebugEvent {
  timestamp: Date;
  sessionId: string;
  category: LogCategory;
  level: LogLevel;
  message: string;
  data?: any;
  source: 'claude' | 'user' | 'system';
  icon?: string;
}

export interface LoggerConfig {
  verbosity: 'minimal' | 'normal' | 'verbose' | 'debug';
  enableTimestamps: boolean;
  enableIcons: boolean;
  filterCategories?: LogCategory[];
}

export class DebugLogger extends EventEmitter {
  private config: LoggerConfig;
  private static instance: DebugLogger | null = null;

  constructor(config: LoggerConfig = {
    verbosity: 'normal',
    enableTimestamps: true,
    enableIcons: true
  }) {
    super();
    this.config = config;
  }

  static getInstance(config?: LoggerConfig): DebugLogger {
    if (!this.instance) {
      this.instance = new DebugLogger(config);
    }
    return this.instance;
  }

  private shouldLog(category: LogCategory, level: LogLevel): boolean {
    // Filter by category if specified
    if (this.config.filterCategories && !this.config.filterCategories.includes(category)) {
      return false;
    }

    // Filter by verbosity level
    switch (this.config.verbosity) {
      case 'minimal':
        return level >= LogLevel.WARN;
      case 'normal':
        return level >= LogLevel.INFO;
      case 'verbose':
        return level >= LogLevel.DEBUG;
      case 'debug':
        return true;
      default:
        return level >= LogLevel.INFO;
    }
  }

  private formatMessage(event: DebugEvent): string {
    const parts: string[] = [];

    // Timestamp
    if (this.config.enableTimestamps) {
      const time = event.timestamp.toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
      });
      parts.push(`[${time}]`);
    }

    // Icon and category
    if (this.config.enableIcons && event.icon) {
      parts.push(`${event.icon} ${event.message}`);
    } else {
      parts.push(`[${event.category.toUpperCase()}] ${event.message}`);
    }

    return parts.join(' ');
  }

  private getIcon(category: LogCategory, level: LogLevel): string {
    switch (category) {
      case LogCategory.SESSION:
        return level >= LogLevel.WARN ? '🚨' : '🚀';
      case LogCategory.BREAKPOINT:
        return '📍';
      case LogCategory.EXECUTION:
        return level >= LogLevel.WARN ? '⚠️' : '▶️';
      case LogCategory.INSPECTION:
        return '🔍';
      case LogCategory.PROGRAM_OUTPUT:
        return '📤';
      case LogCategory.PROGRAM_ERROR:
        return '🚨';
      case LogCategory.CLAUDE_ACTION:
        return '🤖';
      case LogCategory.USER_ACTION:
        return '👤';
      case LogCategory.SYSTEM:
        return '🔧';
      default:
        return '📋';
    }
  }

  log(
    sessionId: string,
    category: LogCategory,
    level: LogLevel,
    message: string,
    data?: any,
    source: 'claude' | 'user' | 'system' = 'system'
  ): void {
    if (!this.shouldLog(category, level)) {
      return;
    }

    const event: DebugEvent = {
      timestamp: new Date(),
      sessionId,
      category,
      level,
      message,
      data,
      source,
      icon: this.getIcon(category, level)
    };

    // Emit event for broadcasting to Claude Code
    this.emit('debugEvent', event);

    // Terminal output
    const formattedMessage = this.formatMessage(event);
    
    if (level >= LogLevel.ERROR) {
      console.error(formattedMessage);
    } else {
      console.error(formattedMessage); // Using stderr for all debug output
    }

    // Add additional context for verbose logging
    if (this.config.verbosity === 'debug' && data) {
      console.error(`           📊 Data:`, JSON.stringify(data, null, 2)
        .split('\n')
        .map((line, i) => i === 0 ? line : `           ${line}`)
        .join('\n'));
    }
  }

  // Convenience methods for different log levels and categories
  session(sessionId: string, message: string, data?: any, source?: 'claude' | 'user' | 'system'): void {
    this.log(sessionId, LogCategory.SESSION, LogLevel.INFO, message, data, source);
  }

  sessionError(sessionId: string, message: string, data?: any, source?: 'claude' | 'user' | 'system'): void {
    this.log(sessionId, LogCategory.SESSION, LogLevel.ERROR, message, data, source);
  }

  breakpoint(sessionId: string, message: string, data?: any, source?: 'claude' | 'user' | 'system'): void {
    this.log(sessionId, LogCategory.BREAKPOINT, LogLevel.INFO, message, data, source);
  }

  execution(sessionId: string, message: string, data?: any, source?: 'claude' | 'user' | 'system'): void {
    this.log(sessionId, LogCategory.EXECUTION, LogLevel.INFO, message, data, source);
  }

  executionPaused(sessionId: string, message: string, data?: any, source?: 'claude' | 'user' | 'system'): void {
    this.log(sessionId, LogCategory.EXECUTION, LogLevel.INFO, `⏸️  EXECUTION PAUSED`, data, source);
    if (data?.reason) {
      this.log(sessionId, LogCategory.EXECUTION, LogLevel.INFO, `🎯 Reason: ${data.reason}`, data, source);
    }
    if (data?.location) {
      this.log(sessionId, LogCategory.EXECUTION, LogLevel.INFO, `📍 Location: ${data.location}`, data, source);
    }
    if (data?.threadName) {
      this.log(sessionId, LogCategory.EXECUTION, LogLevel.INFO, `🧵 Thread: ${data.threadName}`, data, source);
    }
  }

  inspection(sessionId: string, message: string, data?: any, source?: 'claude' | 'user' | 'system'): void {
    this.log(sessionId, LogCategory.INSPECTION, LogLevel.INFO, message, data, source);
  }

  claudeInspecting(sessionId: string, message: string, data?: any): void {
    this.log(sessionId, LogCategory.CLAUDE_ACTION, LogLevel.INFO, `🔍 CLAUDE INSPECTING`, data, 'claude');
    this.log(sessionId, LogCategory.CLAUDE_ACTION, LogLevel.INFO, `🔎 ${message}`, data, 'claude');
  }

  programOutput(sessionId: string, content: string, scriptPath: string, source?: 'claude' | 'user' | 'system'): void {
    const lines = content.split('\n');
    lines.forEach(line => {
      if (line.trim()) {
        this.log(sessionId, LogCategory.PROGRAM_OUTPUT, LogLevel.INFO, 
          `📤 [PYTHON] ${line.trim()}`, { scriptPath }, source);
      }
    });
  }

  programError(sessionId: string, content: string, scriptPath: string, source?: 'claude' | 'user' | 'system'): void {
    const lines = content.split('\n');
    lines.forEach(line => {
      if (line.trim()) {
        this.log(sessionId, LogCategory.PROGRAM_ERROR, LogLevel.ERROR, 
          `🚨 [PYTHON] ${line.trim()}`, { scriptPath }, source);
      }
    });
  }

  system(sessionId: string, message: string, data?: any, source?: 'claude' | 'user' | 'system'): void {
    this.log(sessionId, LogCategory.SYSTEM, LogLevel.INFO, message, data, source);
  }

  systemError(sessionId: string, message: string, data?: any, source?: 'claude' | 'user' | 'system'): void {
    this.log(sessionId, LogCategory.SYSTEM, LogLevel.ERROR, message, data, source);
  }

  // Update configuration
  updateConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  // Get current configuration
  getConfig(): LoggerConfig {
    return { ...this.config };
  }
}

// Export singleton instance
export const logger = DebugLogger.getInstance();