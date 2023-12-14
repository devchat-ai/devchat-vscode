
import os
import subprocess
import sys
import threading

import commit_cases

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))

os.environ['PYTHONPATH'] = os.path.join(ROOT_DIR, 'tools', 'site-packages')
os.environ['command_python'] = '/Users/admin/.chat/mamba/envs/devchat-commands/bin/python'


def run_devchat_command(model, commit_command, input_mock):
    timeout = 300  # 超时时间，单位为秒
    # 构建命令
    command = [
        sys.executable, '-m', 'devchat', 'prompt', '-m', 'gpt-3.5-turbo', '--', commit_command
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
    
    case_results = []
    for case in commit_cases.get_cases():
        case_result = False
        exit_code = -1
        setup_result = case['setup']()
        if setup_result:
            exit_code = run_devchat_command(model, case['input'], case['input_mock'])
            case_result = case['assert']()
            case['teardown']()
            case_results.append((case['title'](), case_result and exit_code == 0))
        else:
            print('Error: test case setup failed!')
            case_results.append((case['title'](), 'Error: test case setup failed!'))
        print('Case result:', case_result, '  Exit code:', exit_code)
    
    print('All case results:')
    is_error = False
    for case_result in case_results:
        print(case_result[0], case_result[1])
        if case_result[1] != True:
            is_error = True
    if is_error:
        sys.exit(-1)
    else:
        sys.exit(0)

run_commit_tests()
