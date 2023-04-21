
const { Configuration, OpenAIApi } = require("openai");

const configuration = new Configuration({
apiKey: "sk-xxxx",
});

// Set up proxy settings
const openai = new OpenAIApi(configuration);

const HttpsProxyAgent = require('https-proxy-agent')
const HttpProxyAgent = require('http-proxy-agent');
const httpAgent = new HttpProxyAgent("http://127.0.0.1:4780");
const httpsAgent = new HttpsProxyAgent("http://127.0.0.1:4780");

export async function chatWithGPT(prompt: string, session_id: string, messageList: Array<{ role: string; content: string }>): Promise<any[]> {
    const fullConversation = [
        ...messageList,
        {
          role: 'user',
          content: prompt,
        },
      ];

      const some_array = [
            {role: 'user', content: 'how are you?'},
            {role: 'assistant', content: "As an AI language model, I don't have feelin… you for asking. How can I assist you today?"},
            {role: 'user', content: 'what is my question?'}
        ]

    try {
        console.log(fullConversation)
        console.log(some_array)
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
                httpAgent,
                httpsAgent
            }
        );

        return [0, completion.data.choices[0].message.content]
    } catch (e) {
        console.log("Error:", e.message)
        return [-1, "Error while connecting to the GPT model."];
    }
}