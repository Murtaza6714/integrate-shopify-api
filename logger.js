const path = require("path")
const DailyRotateFile = require("winston-daily-rotate-file")
const colorette = require("colorette");
const { createLogger, format, transports } = require("winston")
const { combine, timestamp, printf, splat } = format;

const myFormat = printf(({ level, message, timestamp }) => {
  return `${timestamp} :  [${level}] : ${message}`;
});

const errorLoggingPath = path.join("logs", "error-logs");
const infoLoggingPath = path.join("logs", "info-logs");

const errorTransport = new DailyRotateFile({
  filename: errorLoggingPath + "/application-%DATE%.log",
  // dirname: path.join(__dirname, errorLoggingPath),
  datePattern: "YYYY-MM-DD-HH",
  zippedArchive: true,
  maxSize: "20m",
  maxFiles: "14d",
  level: "error",
});

const infoTransport = new DailyRotateFile({
  filename: infoLoggingPath + "/application-%DATE%.log",
  // dirname: path.join(__dirname, infoLoggingPath),
  datePattern: "YYYY-MM-DD-HH",
  zippedArchive: true,
  maxSize: "20m",
  maxFiles: "14d",
  level: "info",
});

const consoleFormat = format.printf(
  ({ level, message, timestamp, ...metadata }) => {
    const levelUpper = level.toUpperCase();
    let emoji = "";
    switch (levelUpper) {
      case "INFO":
        emoji = "✌️";
        message = colorette.green(message);
        level = colorette.greenBright(level);
        break;

      case "WARN":
        emoji = "⚠️";
        message = colorette.yellow(message);
        level = colorette.yellowBright(level);
        break;

      case "ERROR":
        emoji = "💥";
        message = colorette.red(message);
        level = colorette.redBright(level);
        break;

      default:
        break;
    }
    return `${emoji}  ${colorette.whiteBright(
      timestamp
    )} : [${level}] : ${message}`;
  }
);

const logger = createLogger({
  format: combine(timestamp(), splat(), myFormat),
  transports: [errorTransport, infoTransport],
});

if (process.env.NODE_ENV !== "production") {
  const consoleTransport = new transports.Console({
    format: combine(timestamp(), splat(), consoleFormat),
  });
  logger.add(consoleTransport);
}

module.exports = logger;