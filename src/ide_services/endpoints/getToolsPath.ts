import { UiUtilWrapper } from "../../util/uiUtil";


export async function getExtensionToolsPath(): Promise<string> {
    return await UiUtilWrapper.extensionPath() + "/tools/";
}