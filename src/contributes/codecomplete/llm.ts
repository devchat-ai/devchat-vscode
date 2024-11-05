
/*
 通过LLM模型生成代码补全
*/
import axios from 'axios';
import fetch from 'node-fetch';

import { logger } from "../../util/logger";
import { Chunk } from 'webpack';
import { DevChatConfig } from '../../util/config';


// 定义代码补全chunk结构内容
export interface CodeCompletionChunk {
    text: string;
    id: string;
}

export async function* streamComplete(prompt: string): AsyncGenerator<CodeCompletionChunk> {
    const nvidiaKey = DevChatConfig.getInstance().get("complete_key");
    const ollamaApiBase = DevChatConfig.getInstance().get("complete_ollama_api_base");
    const devchatToken = DevChatConfig.getInstance().get("providers.devchat.api_key");
    const devchatEndpoint = DevChatConfig.getInstance().get("providers.devchat.api_base");

    if (ollamaApiBase) {
        for await (const chunk of ollamaDeepseekComplete(prompt)) {
            yield chunk;
        }
    } else if (nvidiaKey) {
        for await (const chunk of nvidiaStarcoderComplete(prompt)) {
            yield chunk;
        }
    } else if (devchatToken && devchatEndpoint) {
        for await (const chunk of devchatComplete(prompt)) {
            yield chunk;
        }
    }
}

export async function * nvidiaStarcoderComplete(prompt: string) : AsyncGenerator<CodeCompletionChunk> {
    const invokeUrl = 'https://api.nvcf.nvidia.com/v2/nvcf/pexec/functions/6acada03-fe2f-4e4d-9e0a-e711b9fd1b59';

    const nvidiaKey = DevChatConfig.getInstance().get("complete_key");
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
                const chunkDataText = decoder.decode(chunk).trim();
                // split chunkText by "data: ", for example:
                // data: 123 data: 456 will split to ["", "data: 123 ", "data: 456"]
                const chunkTexts = chunkDataText.split("data: ");
                for (const chunkTextSplit of chunkTexts) {
                    if (chunkTextSplit.trim().length === 0) {
                        continue;
                    }
                    
                    const chunkText = "data: " + chunkTextSplit.trim();
                    
                    // logger.channel()?.info("receve chunk:", chunkText);
                    // data: {"id": "cmpl-1713846153", "created": 1713846160.292709, "object": "completion.chunk", "model": "ollama/starcoder2:7b", "choices": [{"index": 0, "finish_reason": "stop", "text": "\n});"}]}
                    // data: {"id": "cmpl-1713846153", "created": 1713846160.366049, "object": "completion.chunk", "model": "ollama/starcoder2:7b", "choices": [{"index": 0, "finish_reason": "stop", "text": ""}], "usage": {"prompt_tokens": 413, "completion_tokens": 16}}
                    if (!chunkText.startsWith("data:")) {
                        // log unexpected data
                        logger.channel()?.warn("Unexpected data: " + chunkText);
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
                        logger.channel()?.warn("JSON Parsing Error:", e.message);
                    }
                }
            }
        } else {
            logger.channel()?.error("Error making request:", response.statusText);
        }
    } catch (error: any) {
        logger.channel()?.error("Error making request:", error.message);
    }
}

export async function * ollamaDeepseekComplete(prompt: string) : AsyncGenerator<CodeCompletionChunk> {
    const ollamaApiBase = DevChatConfig.getInstance().get("complete_ollama_api_base");
    if (!ollamaApiBase) {
        return;
    }

    const urlBase = ollamaApiBase.trim().endsWith('/') ? ollamaApiBase : ollamaApiBase + '/';
    const url = urlBase + 'api/generate';

    let model = DevChatConfig.getInstance().get("complete_model");
    if (!model) {
        model = "starcoder2:15b";
    }

	const headers = {
	  'Content-Type': 'application/json',
	};
	const payload = {
	  model: model,
	  prompt: prompt,
	  stream: true,
	  options: {
        stop: ["<|endoftext|>", "<|EOT|>", "<file_sep>", "```", "/", "\n\n"],
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
                    // logger.channel()?.info("receive:", chunkText);
                    logger.channel()?.warn("JSON Parsing fail:", e.message);
                }
            }
        } else {
            logger.channel()?.error("Error making request:", response.statusText);
        }
    } catch (error: any) {
        logger.channel()?.error("Error making request:", error.message);
    }
}



export async function * devchatComplete(prompt: string) : AsyncGenerator<CodeCompletionChunk> {
    const devchatEndpoint = DevChatConfig.getInstance().get("providers.devchat.api_base");
    const llmApiBase = DevChatConfig.getInstance().get("complete_api_base");
    let completionApiBase = devchatEndpoint + "/completions";
    if (llmApiBase) {
        completionApiBase = llmApiBase + "/completions";
    }

    let model = DevChatConfig.getInstance().get("complete_model");
    if (!model) {
        model = "ollama/starcoder2:15b";
    }

    const startTimeLLM = process.hrtime();

    const headers = {
        'Content-Type': 'application/json'
    };
    const payload = {
        model: model,
        prompt: prompt,
        stream: true,
        stop: ["<|endoftext|>", "<|EOT|>", "<file_sep>", "\n\n"],
        temperature: 0.2,
        max_tokens: 200
    };

    // 内部实现的 sleep 函数
    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    try {
        const response = await fetch(completionApiBase, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
        });

        if (response.ok && response.body) {
            const stream = response.body as any;
            const decoder = new TextDecoder("utf-8");

            const endTimeLLM = process.hrtime(startTimeLLM);
            const durationLLM = endTimeLLM[0] + endTimeLLM[1] / 1e9;
            logger.channel()?.debug(`LLM api post took ${durationLLM} seconds`);

            let hasFirstChunk = false;
            let hasFirstLine = false;
            let buffer = '';
            const dataRegex = /^data: /m;  // 匹配行首的 "data: "

            // 模拟接收数据的函数
            async function* simulateStreamReceive(stream: any): AsyncGenerator<Uint8Array> {
                for await (const chunk of stream) {
                    const chunkSize = chunk.length;
                    const numParts = Math.ceil(Math.random() * 3) + 1; // 随机将chunk分成1-4部分
                    const partSize = Math.ceil(chunkSize / numParts);

                    for (let i = 0; i < chunkSize; i += partSize) {
                        const part = chunk.slice(i, Math.min(i + partSize, chunkSize));
                        logger.channel()?.debug(`Simulated receiving part ${i / partSize + 1}/${numParts} of chunk, size: ${part.length} bytes`);
                        yield part;
                        await sleep(Math.random() * 100); // 模拟网络延迟，0-100ms
                    }
                }
            }

            for await (const chunk of stream) {
                if (!hasFirstChunk) {
                    hasFirstChunk = true;
                    const endTimeFirstChunk = process.hrtime(startTimeLLM);
                    const durationFirstChunk = endTimeFirstChunk[0] + endTimeFirstChunk[1] / 1e9;
                    logger.channel()?.debug(`LLM first chunk took ${durationFirstChunk} seconds`);
                }

                const chunkDataText = decoder.decode(chunk);
                buffer += chunkDataText;

                while (true) {
                    const match = dataRegex.exec(buffer);
                    if (!match) break;

                    const dataStart = match.index;
                    const nextDataStart = buffer.slice(dataStart + 5).search(dataRegex);
                    const jsonEnd = nextDataStart !== -1 ? dataStart + 5 + nextDataStart : buffer.length;
                    const jsonData = buffer.substring(dataStart + 5, jsonEnd).trim();

                    if (jsonData === "[DONE]") {
                        return;
                    }

                    try {
                        const data = JSON.parse(jsonData);
                        if (!hasFirstLine && data.choices[0].text.indexOf("\n") !== -1) {
                            hasFirstLine = true;
                            const endTimeLine = process.hrtime(startTimeLLM);
                            const durationLine = endTimeLine[0] + endTimeLine[1] / 1e9;
                            logger.channel()?.debug(`LLM first line took ${durationLine} seconds`);
                        }
                        yield {
                            text: data.choices[0].text,
                            id: data.id
                        };
                        buffer = buffer.slice(jsonEnd);
                    } catch (e) {
                        // 如果解析失败，可能是因为数据不完整，我们继续到下一个循环
                        if (nextDataStart === -1) {
                            // 如果没有下一个 'data:'，保留剩余的buffer
                            break;
                        }
                        buffer = buffer.slice(dataStart + 5 + nextDataStart);
                    }
                }
            }
        } else {
            logger.channel()?.error("Error making request:", response.statusText);
        }
    } catch (error: any) {
        logger.channel()?.error("Error making request:", error.message);
    }
}