import { UiUtilWrapper } from "../../util/uiUtil";

export async function ideLanguage() {
    const language = UiUtilWrapper.getConfiguration("DevChat", "Language");
    // 'en' stands for English, 'zh' stands for Simplified Chinese
    return language;
}
