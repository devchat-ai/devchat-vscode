import { logger } from "../../util/logger";

export async function ideLogging(level: string, message: string) {
    if (typeof logger.channel()?.[level] === "function") {
        // level is one of "info", "warn", "error", "debug"
        logger.channel()?.[level](message);
        return true;
    }
    return false;
}
