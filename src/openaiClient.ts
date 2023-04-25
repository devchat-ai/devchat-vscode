
const { Configuration, OpenAIApi } = require("openai");
import * as dotenv from 'dotenv';
import * as path from 'path';

const extensionDir = path.resolve(__dirname, '..');
const envFilePath = path.join(extensionDir, '.env');
const dotenvOutput = dotenv.config({ path: envFilePath });
console.log('dotenv output:', dotenvOutput);

const configuration = new Configuration({
apiKey: process.env.OPENAI_API_KEY,
});

// Set up proxy settings
const openai = new OpenAIApi(configuration);

const HttpsProxyAgent = require('https-proxy-agent')
const HttpProxyAgent = require('http-proxy-agent');

export async function chatWithGPT(prompt: string, session_id: string, messageList: Array<{ role: string; content: string }>): Promise<any[]> {
    const fullConversation = [
        ...messageList,
        {
          role: 'user',
          content: prompt,
        },
      ];

    try {
        let completion = await openai.createChatCompletion({
            model: "gpt-3.5-turbo",
            messages: fullConversation,
            temperature: 0.9,
            max_tokens: 2048,
            top_p: 1,
            frequency_penalty: 0.0,
            presence_penalty: 0.6,
            stop: null,
        },
            {
            }
        );

        return [0, completion.data.choices[0].message.content]
    } catch (e) {
        console.log("Error:", e.message)
        return [-1, "Error while connecting to the GPT model."];
    }
}