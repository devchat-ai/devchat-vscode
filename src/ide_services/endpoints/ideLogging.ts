import { logger } from "../../util/logger";

export async function logInfo(message: string) {
    logger.channel()?.info(message);
    return true;
}
export async function logWarn(message: string) {
    logger.channel()?.warn(message);
    return true;
}
export async function logError(message: string) {
    logger.channel()?.error(message);
    return true;
}
