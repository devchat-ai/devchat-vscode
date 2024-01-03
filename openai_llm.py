import re
import os
import sys
import json

import openai


def _try_remove_markdown_block_flag(content):
    """
    如果content是一个markdown块，则删除它的头部```xxx和尾部```
    """
    # 定义正则表达式模式，用于匹配markdown块的头部和尾部
    pattern = r"^\s*```\s*(\w+)\s*\n(.*?)\n\s*```\s*$"

    # 使用re模块进行匹配
    match = re.search(pattern, content, re.DOTALL | re.MULTILINE)

    if match:
        # 如果匹配成功，则提取出markdown块的内容并返回
        _ = match.group(1)  # language
        markdown_content = match.group(2)
        return markdown_content.strip()
    else:
        # 如果匹配失败，则返回原始内容
        return content


def chat_completion_no_stream(messages, llm_config, error_out: bool = True) -> str:
    """
    通过ChatCompletion API获取OpenAI聊天机器人的回复。

    Args:
        messages: 一个列表，包含用户输入的消息。
        llm_config: 一个字典，包含ChatCompletion API的配置信息。
        error_out: 如果为True，遇到异常时输出错误信息并返回None，否则返回None。

    Returns:
        如果成功获取到聊天机器人的回复，返回一个字符串类型的回复消息。如果连接失败，则返回None。

    """
    for try_times in range(3):
        try:
            client = openai.OpenAI(
                api_key=os.environ.get("OPENAI_API_KEY", None),
                base_url=os.environ.get("OPENAI_API_BASE", None),
            )

            llm_config["stream"] = True
            llm_config["timeout"] = 8
            response = client.chat.completions.create(messages=messages, **llm_config)

            response_result = {"content": None, "function_name": None, "parameters": ""}
            for chunk in response:  # pylint: disable=E1133
                chunk = chunk.dict()
                delta = chunk["choices"][0]["delta"]
                if "tool_calls" in delta and delta["tool_calls"]:
                    tool_call = delta["tool_calls"][0]["function"]
                    if tool_call.get("name", None):
                        response_result["function_name"] = tool_call["name"]
                    if tool_call.get("arguments", None):
                        response_result["parameters"] += tool_call["arguments"]
                if delta.get("content", None):
                    if response_result["content"]:
                        response_result["content"] += delta["content"]
                    else:
                        response_result["content"] = delta["content"]
            return response_result
        except (openai.APIConnectionError, openai.APITimeoutError) as err:
            if try_times >= 2:
                if error_out:
                    print("Exception:", err, file=sys.stderr, flush=True)
                return None
            continue
        except openai.APIError as err:
            if error_out:
                print("Exception:", err, file=sys.stderr, flush=True)
            return None
    return None


def chat_completion_no_stream_return_json(messages, llm_config, error_out: bool = True):
    """
    尝试三次从聊天完成API获取结果，并返回JSON对象。
    如果无法解析JSON，将尝试三次，直到出现错误或达到最大尝试次数。

    Args:
        messages (List[str]): 用户输入的消息列表。
        llm_config (Dict[str, Any]): 聊天配置字典。
        error_out (bool, optional): 如果为True，则如果出现错误将打印错误消息并返回None。默认为True。

    Returns:
        Dict[str, Any]: 从聊天完成API获取的JSON对象。
            如果无法解析JSON或达到最大尝试次数，则返回None。
    """
    for _1 in range(3):
        response = chat_completion_no_stream(messages, llm_config)
        if response is None:
            return None

        try:
            # json will format as ```json ... ``` in 1106 model
            response_content = _try_remove_markdown_block_flag(response["content"])
            response_obj = json.loads(response_content)
            return response_obj
        except json.JSONDecodeError:
            continue
        except Exception as err:
            if error_out:
                print("Exception: ", err, file=sys.stderr, flush=True)
            return None
    if error_out:
        print("Not valid json response:", response["content"], file=sys.stderr, flush=True)
    return None
