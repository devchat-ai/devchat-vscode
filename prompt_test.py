import os
import subprocess

# set the OpenAI API key
os.environ['OPENAI_API_KEY'] = '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'

def call_gpt(input: str, prompt: str) -> str:
    """
    This function calls GPT through the devchat chat command.
    It takes a string as input and returns a string as output.

    Args:
        input (str): The input string to send to GPT.
        prompt (str): The prompt string to send to GPT.

    Returns:
        str: The output string from GPT.
    """
    new_prompt = input + prompt
    
    # call devchat chat {new_prompt}
    # devchat is a command line tool that calls GPT through the OpenAI API
    print('==> call devchat chat')
    result = subprocess.run(['/Users/admin/work/devchat-vscode/tools/devchat/bin/devchat', 'prompt', new_prompt], capture_output=True, text=True)

    if result.returncode != 0:
        print(result.stderr)
        raise Exception(f"Error in calling GPT: {result.stderr}")

    print("GPT output:")
    print(result.stdout)
    return result.stdout


def process_requirements(requirements: list) -> list:
    """
    This function processes a list of requirements. For each requirement, it generates a function implementation
    using GPT, generates a prompt text from the function implementation using GPT, and calculates the similarity
    between the requirement and the prompt text using GPT. The results are returned as a list of similarity scores.

    Args:
        requirements (list): The list of requirements to process.

    Returns:
        list: The list of similarity scores.
    """
    similarity_results = []
    for requirement in requirements:
        try:
            # Step 1: Generate function implementation
            function_implementation = call_gpt(requirement, "\n只生成满足需求的函数实现,不能生成除源码外的其他文本信息，生成的代码中不能包含注释语句。程序可以由多个函数组成，入口目标函数名称为MyFunction,")
            
            # Step 2: Generate prompt text
            prompt_text = call_gpt(function_implementation, "\n生成当前代码中MyFunction函数的意图描述，只生成意图描述文本")
            
            # Step 3: Calculate similarity
            similarity = call_gpt(f"Calculate similarity between ```{requirement}``` and ```{prompt_text}```", "\n这两个文本是对两个函数功能的描述，这两个函数相似度有多高？")
            
            similarity_results.append(similarity)
        except Exception as e:
            print(f"Error in processing requirement: {e}")
            similarity_results.append("Error in processing requirement")
    
    return similarity_results

def process_requirements2(requirements: list) -> list:
    """
    This function processes a list of requirements. For each requirement, it generates a function implementation
    using GPT, generates a prompt text from the function implementation using GPT, and calculates the similarity
    between the requirement and the prompt text using GPT. The results are returned as a list of similarity scores.

    Args:
        requirements (list): The list of requirements to process.

    Returns:
        list: The list of similarity scores.
    """
    similarity_results = []
    for requirement in requirements:
        try:
            # Step 1: Generate function implementation
            function_implementation = call_gpt(requirement, "\n只生成满足需求的函数实现,不能生成除源码外的其他文本信息，生成的代码中不能包含注释语句。程序可以由多个函数组成，入口目标函数名称为MyFunction,")
            
            # step 1.5: get MyFunction in source code
            function_implementation2 = call_gpt(function_implementation, "\n从当前代码中，提取出MyFunction函数的源码，不包含其他函数源码实现。")

            # Step 2: Generate prompt text
            prompt_text = call_gpt(function_implementation2, "\n生成当前代码中MyFunction函数的意图描述，只生成意图描述文本")
            
            # Step 3: Calculate similarity
            similarity = call_gpt(f"Calculate similarity between ```{requirement}``` and ```{prompt_text}```", "\n这两个文本是对两个函数功能的描述，这两个函数相似度有多高？")
            
            similarity_results.append(similarity)
        except Exception as e:
            print(f"Error in processing requirement: {e}")
            similarity_results.append("Error in processing requirement")
    
    return similarity_results

def process_requirements3(requirements: list) -> list:
    """
    This function processes a list of requirements. For each requirement, it generates a function implementation
    using GPT, generates a prompt text from the function implementation using GPT, and calculates the similarity
    between the requirement and the prompt text using GPT. The results are returned as a list of similarity scores.

    Args:
        requirements (list): The list of requirements to process.

    Returns:
        list: The list of similarity scores.
    """
    similarity_results = []
    for requirement in requirements:
        try:
            # Step 1: Generate function implementation
            function_implementation = call_gpt(requirement, "\n只生成满足需求的函数实现,不能生成除源码外的其他文本信息，生成的代码中不能包含注释语句。程序可以由多个函数组成，入口目标函数名称为MyFunction。")
            
			# step 1.5: get MyFunction in source code
            function_implementation2 = call_gpt(function_implementation, "\n在当前代码中，保留MyFunction函数的源码，其他函数中删除源码，将源码转化为函数意图注释。")
            
            # Step 2: Generate prompt text
            prompt_text = call_gpt(function_implementation2, "\n生成当前代码中MyFunction函数的意图描述，只生成意图描述文本")
            
            # Step 3: Calculate similarity
            similarity = call_gpt(f"Calculate similarity between ```{requirement}``` and ```{prompt_text}```", "\n这两个文本是对两个函数功能的描述，这两个函数相似度有多高？")
            
            similarity_results.append(similarity)
        except Exception as e:
            print(f"Error in processing requirement: {e}")
            similarity_results.append("Error in processing requirement")
    
    return similarity_results

def main():
    """
    The main function of the script. It reads a list of requirements from the user, processes the requirements,
    and prints the similarity scores.
    """
    # TODO: Replace this with the actual way to get the list of requirements.
    requirements = [
        # "对一个数字数组进行从大到小排序，计算出排序前20%元素的平均值。",
        # "实现一个五子棋游戏棋盘数组是否有赢家的判断函数。",
        # "输入两个字符串，计算两个字符串的最长公共子序列。",
        # "对一个图像二维数组进行3*3大高斯滤波，计算出滤波后图像的平均值。",
        # "对一个Python源码文件，统计注释行数。",
        # "实现俄罗斯方块游戏的下落算法函数，可以有子函数。",
        # "将图像转化为字符表示的图像，可以有子函数。",
        # "实现一个二维地图障碍物生成算法，障碍物不能超过地图的30%，并且障碍物不能重叠，也不能处于地图范围之外。",
        # "实现一个加密算法，对每个字符进行加密，加密算法为：将字符转化为ASCII码，然后加上一个密钥字符，再转化为字符。密钥字符串为：'abc123',密钥字符串的长度为6，如果字符加上密钥字符后超过了ASCII码的最大值，那么从头开始循环使用密钥字符。",
        # "实现一个转化程序，将JSON格式字符串，转化为HTML树形表结构代码。",
        # "不依赖现有库，实现MD5加密算法。",
        # "实现飞行控制程序，根据当前的姿态，输出四轴旋翼的转动速度，使得四轴旋翼的姿态与目标姿态一致。",
        # "实现一个3元一次方程组的求解程序，输入为3个方程，输出为3个未知数的解。",
        # "实现一个控制程序，循环从串口接收命令，当接收到启动命令时，调用汽车启动函数（cm.start)，实现汽车自启动。",
        # "实现一个过滤程序，输入是pytest测试的输出文本，输出是过滤掉不是核心重要信息后的文本，保留测试结果，关键错误描述信息。",
        # "实现扫雷游戏下一步操作分析算法。输入是当前扫雷游戏的棋盘二维数组状态，输出是下一步应该点击查看的位置坐标。分析算法需要根据已知地图信息找出最不可能有地雷的坐标。",
		# "实现坦克大战游戏的绘制函数，输入是地图二维数组，包含了障碍物信息，坦克位置信息，输出是绘制好的游戏地图。坦克和障碍物都应该是独立的类对象，坦克类对象应该有移动函数，开火函数，坦克类对象应该有绘制函数，可以绘制坦克的位置，方向，血量等信息。",
        "实现一个智能家居系统，接收用户的文字输入，将其通过GF函数转化为智能家居操作命令，并通过该命令驱动完成知能家居的操作。代码中演示了包含'打开灯'命令，参数为'灯的亮度'的GF函数的实现。",
    ]
    
    similarity_results = process_requirements(requirements)
    similarity_results2 = process_requirements2(requirements)
    similarity_results3 = process_requirements3(requirements)
    
    for requirement, similarity, similarity2, similarity3 in zip(requirements, similarity_results, similarity_results2, similarity_results3):
        print(f"Requirement: {requirement}")
        print(f"Similarity1: {similarity}")
        print(f"Similarity2: {similarity2}")
        print(f"Similarity3: {similarity3}")
        print()


if __name__ == "__main__":
    main()