import { logger } from "../../util/logger";

export async function getServicePort() {
    logger
        .channel()
        ?.info(`get lsp bridge port: ${process.env.DEVCHAT_IDE_SERVICE_PORT}`);
    // return await UiUtilWrapper.getLSPBrigePort();
    return process.env.DEVCHAT_IDE_SERVICE_PORT;
}
