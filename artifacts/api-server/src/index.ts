import app from "./app";
import { logger } from "./lib/logger";

const port = process.env.PORT || 10000;

app.listen(port, "0.0.0.0", () => {
  logger.info(`Server running on port ${port}`);
});