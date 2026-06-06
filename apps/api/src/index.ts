import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { createServer } from "./server.js";

const { server } = createServer();

server.listen(env.API_PORT, () => {
  logger.info({ port: env.API_PORT }, "ChatLeadIQ API listening");
});
