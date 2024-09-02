import { ExtensionContextHolder } from "./extensionContext";

export let ASSISTANT_NAME_EN = "DevChat";
export let ASSISTANT_NAME_ZH = "DevChat";

export function updateNames(nameEN, nameZH) {
    ASSISTANT_NAME_EN = nameEN;
    ASSISTANT_NAME_ZH = nameZH;
}