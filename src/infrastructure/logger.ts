import { configure, getLogger, type LogRecord } from "@logtape/logtape";

configure({
  sinks: {
    console: (record: LogRecord) => {
      console.log(`[${record.category}] ${record.message}`);
    },
  },
  filters: {},
  loggers: [
    { category: ["strong-groseries"], sinks: ["console"], level: "info" },
    {
      category: ["strong-groseries", "api"],
      sinks: ["console"],
      level: "debug",
    },
    { category: ["strong-groseries", "db"], sinks: ["console"], level: "warn" },
  ],
});

export const logger = getLogger(["strong-groseries"]);
export const apiLogger = getLogger(["strong-groseries", "api"]);
export const dbLogger = getLogger(["strong-groseries", "db"]);
