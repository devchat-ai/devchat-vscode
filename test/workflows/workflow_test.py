
import os
import subprocess
import sys
import threading

import commit_cases

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))

os.environ['OPENAI_API_KEY'] = 'DC.eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJvcmdfaWQiOjgxNTA4MTEzODY2LCJqdGkiOjcyNzUxMjY2MjUzOTcyNTA0ODV9.uKPJBDiU8EAdtokNBZ3JsfyEXh7HS4ScuB1k6tQvaWE'
os.environ['OPENAI_API_BASE'] = 'https://api-test.devchat.ai/v1'
os.environ['PYTHONPATH'] = os.path.join(ROOT_DIR, 'tools', 'site-packages')
os.environ['command_python'] = '/Users/admin/.chat/mamba/envs/devchat-commands/bin/python'


def run_devchat_command(model, commit_command, input_mock):
    timeout = 300  # 超时时间，单位为秒
    # 构建命令
    command = [
        sys.executable, '-m', 'devchat', 'prompt', '-m', model, '--', commit_command
    ]
    
    # 使用subprocess.Popen执行命令
    with subprocess.Popen(command, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, env=os.environ) as process:
        def monitor():
            try:
                # 等待设定的超时时间
                process.wait(timeout=timeout)
            except subprocess.TimeoutExpired:
                if process.poll() is None:  # 如果进程仍然在运行，则终止它
                    print(f"Process exceeded timeout of {timeout} seconds. Terminating...")
                    process.terminate()
        
        # 创建并启动监控线程
        monitor_thread = threading.Thread(target=monitor)
        monitor_thread.start()
        
        # 循环读取输出并打印
        while True:
            output = process.stdout.readline()
            if output == '' and process.poll() is not None:
                break
            if output:
                print(output.strip())
                user_input = input_mock(output.strip())
                if user_input:
                    process.stdin.write(user_input)
                    process.stdin.flush()
    
        # 等待进程结束
        process.wait()
        
        # 等待监控线程结束
        monitor_thread.join()
        
        # 返回进程退出码
        return process.returncode




def run_commit_tests():
    model = 'gpt-4-1106-preview'  # 替换为实际的模型名称
    
    for case in commit_cases.get_cases():
        case_result = False
        exit_code = -1
        setup_result = case['setup']()
        if setup_result:
            exit_code = run_devchat_command(model, case['input'], case['input_mock'])
            case_result = case['assert']()
            case['teardown']()
        else:
            print('Error: test case setup failed!')
        print('Case result:', case_result, '  Exit code:', exit_code)

# run_commit_tests()

def hello2():
    print('hello2')

hello2()