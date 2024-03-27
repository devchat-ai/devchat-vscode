import { DevChatConfig } from "../../util/config";

export async function ideLanguage() {
    const language = new DevChatConfig().get('language');
    // 'en' stands for English, 'zh' stands for Simplified Chinese
    return language;
}
