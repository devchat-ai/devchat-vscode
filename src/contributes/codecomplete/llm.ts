
/*
 通过LLM模型生成代码补全
*/
import axios from 'axios';

import { logger } from "../../util/logger";
import { Chunk } from 'webpack';
import { DevChatConfig } from '../../util/config';


// 定义代码补全chunk结构内容
export interface CodeCompletionChunk {
    text: string;
    id: string;
}

export async function* streamComplete(prompt: string): AsyncGenerator<CodeCompletionChunk> {
    for await (const chunk of nvidiaStarcoderComplete(prompt)) {
        yield chunk;
    }
}

export async function * nvidiaStarcoderComplete(prompt: string) : AsyncGenerator<CodeCompletionChunk> {
    const invokeUrl = 'https://api.nvcf.nvidia.com/v2/nvcf/pexec/functions/6acada03-fe2f-4e4d-9e0a-e711b9fd1b59';

    const nvidiaKey = new DevChatConfig().get("complete_key");
    if (!nvidiaKey) {
        return;
    }
    const headers = {
        "Authorization": `Bearer ${nvidiaKey}`,
        "Accept": "text/event-stream",
        "Content-Type": "application/json",
    };

    const payload = {
        "prompt": prompt,
        "temperature": 0.2,
        "top_p": 0.7,
        "max_tokens": 1024,
        "seed": 42,
        "bad": null,
        "stop": ["<file_sep>", "```", "\n\n"],
        "stream": true
    };

    try {
        const response = await fetch(invokeUrl, {
            method: 'POST',
    		headers,
    		body: JSON.stringify(payload),
        });

        if (response.ok && response.body) {
            const stream = response.body as any;
            const decoder = new TextDecoder("utf-8");

            for await (const chunk of stream) {
                const chunkText = decoder.decode(chunk).trim();
                // data: {"id":"5d3376e0-2abc-4230-b796-c6fc9ae91cd4","choices":[{"index":0,"delta":"-","finish_reason":null}]}\n\n
                if (!chunkText.startsWith("data:")) {
                    // log unexpected data
                    logger.channel()?.info("Unexpected data: " + chunkText);
                    return;
                }

                const jsonData = chunkText.substring(5).trim();
                if (jsonData === "[DONE]") {
                    return;
                }

                
                try {
                    const data = JSON.parse(chunkText.substring(5).trim());
                    yield {
                        text: data.choices[0].delta,
                        id: data.id
                    };
                } catch (e: any) {
                    logger.channel()?.info("receve:", chunkText);
                    logger.channel()?.error("JSON Parsing Error:", e.message);
                }
            }
        } else {
            logger.channel()?.error("Error making request:", response.statusText);
        }
    } catch (error: any) {
        logger.channel()?.error("Error making request:", error.message);
    }
}

export async function * ollamaStarcoderComplete(prompt: string) : AsyncGenerator<CodeCompletionChunk> {
    const url = 'http://192.168.1.138:11434/api/generate';
	const headers = {
	  'Content-Type': 'application/json',
	};
	const payload = {
	  model: 'starcoder:7b',
	  prompt: prompt,
	  stream: true,
	  options: {
        stop: ["<|endoftext|>", "<file_sep>", "```", "\n\n"],
		temperature: 0.2
	  }
	};

    let idResponse = undefined;

    try {
        const response = await fetch(url, {
            method: 'POST',
    		headers,
    		body: JSON.stringify(payload),
        });

        if (response.ok && response.body) {
            const stream = response.body as any;
            const decoder = new TextDecoder("utf-8");

            for await (const chunk of stream) {
                const chunkText = decoder.decode(chunk).trim();
                // {"model":"starcoder:7b","created_at":"2024-04-04T08:33:50.624505431Z","response":"sort","done":false}
                
                try {
                    const data = JSON.parse(chunkText.trim());
                    if (!idResponse) {
                        idResponse = data.created_at;
                    }
                    yield {
                        text: data.response,
                        id: idResponse!
                    };
                } catch (e: any) {
                    logger.channel()?.info("receve:", chunkText);
                    logger.channel()?.error("JSON Parsing Error:", e.message);
                }
            }
        } else {
            logger.channel()?.error("Error making request:", response.statusText);
        }
    } catch (error: any) {
        logger.channel()?.error("Error making request:", error.message);
    }
}