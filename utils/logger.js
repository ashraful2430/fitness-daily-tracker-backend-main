/**
 * Logger Utility
 * Centralized logging for production-grade error tracking and monitoring
 */

const fs = require("fs");
const path = require("path");

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, "../logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const logLevels = {
  ERROR: "ERROR",
  WARN: "WARN",
  INFO: "INFO",
  DEBUG: "DEBUG",
};

const colors = {
  ERROR: "\x1b[31m", // Red
  WARN: "\x1b[33m", // Yellow
  INFO: "\x1b[36m", // Cyan
  DEBUG: "\x1b[35m", // Magenta
  RESET: "\x1b[0m",
};

class Logger {
  constructor() {
    this.logFile = path.join(logsDir, `app-${new Date().toISOString().split("T")[0]}.log`);
  }

  formatMessage(level, message, data = null) {
    const timestamp = new Date().toISOString();
    let formattedMessage = `[${timestamp}] [${level}] ${message}`;

    if (data) {
      formattedMessage += ` ${JSON.stringify(data)}`;
    }

    return formattedMessage;
  }

  writeToFile(message) {
    try {
      fs.appendFileSync(this.logFile, message + "\n");
    } catch (error) {
      console.error("Failed to write to log file:", error);
    }
  }

  log(level, message, data = null) {
    const formattedMessage = this.formatMessage(level, message, data);

    // Console output with colors
    if (process.env.NODE_ENV !== "production") {
      console.log(`${colors[level]}${formattedMessage}${colors.RESET}`);
    }

    // File output
    this.writeToFile(formattedMessage);
  }

  error(message, error = null) {
    const errorData = error instanceof Error ? {
      message: error.message,
      stack: error.stack,
    } : error;

    this.log(logLevels.ERROR, message, errorData);
  }

  warn(message, data = null) {
    this.log(logLevels.WARN, message, data);
  }

  info(message, data = null) {
    this.log(logLevels.INFO, message, data);
  }

  debug(message, data = null) {
    if (process.env.NODE_ENV !== "production") {
      this.log(logLevels.DEBUG, message, data);
    }
  }
}

module.exports = new Logger();
