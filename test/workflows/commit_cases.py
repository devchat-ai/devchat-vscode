
import subprocess
import re
import shutil
import os
import json
import ui_parser
import yaml
import openai

# Extract the repository URL and commit hash from the GitHub link
def extract_repo_info(github_link):
    match = re.match(r'https://github\.com/(.+)/(.+)/commit/(.+)', github_link)
    if not match:
        raise ValueError("Invalid GitHub link format.")
    user_repo = match.group(1) + '/' + match.group(2)
    commit_hash = match.group(3)
    repo_url = f'https://github.com/{user_repo}.git'
    return repo_url, commit_hash, match.group(2)

# Clone the repository to the specified directory
def clone_repo(repo_url, target_dir):
    subprocess.run(["git", "clone", repo_url, target_dir], check=True)

# Checkout a specific commit
def checkout_commit(target_dir, commit_hash):
    subprocess.run(["git", "checkout", commit_hash], cwd=target_dir, check=True)

# Get the diff of a specific commit
def diff_of_commit(target_dir, commit_hash):
    # Initialize a subprocess.Popen object to execute the git diff command
    proc = subprocess.Popen(['git', 'diff', commit_hash + '^!'], stdout=subprocess.PIPE, stderr=subprocess.PIPE)

    # Get the command output and error information
    stdout, stderr = proc.communicate()

    # Check if there is any error information
    if stderr:
        print("Error:", stderr.decode())
        return None
    return stdout.decode()

# Reset commit (keep changes in the working directory)
def reset_commit(target_dir):
    subprocess.run(["git", "reset", "HEAD~1"], cwd=target_dir, check=True)

# Main function
def clone_and_reset(github_link, target_dir):
    try:
        # Extract the repository URL and commit hash from the GitHub link
        repo_url, commit_hash, repo_name = extract_repo_info(github_link)
        
        # Create the target directory (if it does not exist)
        repo_path = os.path.join(target_dir, repo_name)
        os.makedirs(repo_path, exist_ok=True)
        
        # Clone the repository to the specified directory
        clone_repo(repo_url, repo_path)
        
        # Checkout a specific commit
        checkout_commit(repo_path, commit_hash)
        
        # Reset commit
        reset_commit(repo_path)
        return repo_path
    except Exception as err:
        print(f"Error: {err}")
        return None
    

def get_last_commit_id():
    # Use the git rev-parse command to get the current HEAD's commit ID
    command = ['git', 'rev-parse', 'HEAD']
    try:
        # Execute the command and capture the standard output
        result = subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True)
        # Return the standard output content, which is the ID of the last commit
        return result.stdout.strip()
    except subprocess.CalledProcessError as e:
        # If the command execution fails, print the error information
        print(f"Error: {e.stderr}")
        return None

def reset_last_commit():
    # Use the git reset command to reset the last commit
    # The --soft option will keep the changes in the working directory
    command = ['git', 'reset', '--soft', 'HEAD~1']
    try:
        # Execute the command
        subprocess.run(command, check=True)
        print("Last commit has been reset successfully.")
    except subprocess.CalledProcessError as e:
        # If the command execution fails, print the error information
        print(f"Error: {e}")

def get_last_commit_message():
    # Use the git log command to get the latest commit message, -1 indicates the last commit
    command = ['git', 'log', '-1', '--pretty=%B']
    try:
        # Execute the command and capture the standard output
        result = subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True)
        # Return the standard output content, which is the message of the last commit
        return result.stdout.strip()
    except subprocess.CalledProcessError as e:
        # If the command execution fails, print the error information
        print(f"Error: {e.stderr}")
        return None

def compare_result_parser(response):
    start = response.find('```json')
    end = response.find('```', start+7)
    if start >= 0 and end > 0:
        content = response[start+7:end].strip()
        result = json.loads(content)
        return result['choice']
    return None

def commit_message_compare(commit_message_a, commit_message_b, diff):
    # call openai to compare which commit message is better
    json_str = '{ "choice": "first" , "reason": ""}'
    prompt = f"""
You are a software developer, your task is to compare two commit messages and choose the better one.

The input for task has two commit messages and a diff of the code changes. You will choose the better commit message and response as JSON format, the format is:
```json
{json_str}
```

Current Input is:
left commit message:
{commit_message_a}

right commit message:
{commit_message_b}

code change diff:
{diff}
"""
    if not diff:
        print('Diff is empty, compare commit message failed!')
        return None
    if len(prompt) > 16000:
        print('Change too much, compare commit message failed!')
        return None
    
    client = openai.OpenAI(
        api_key=os.environ.get("OPENAI_API_KEY", None),
        base_url=os.environ.get("OPENAI_API_BASE", None)
    )

    response = client.chat.completions.create(
        messages=[{'role': 'user', 'content': prompt}],
        model='gpt-4-1106-preview',
        stream=True,
        timeout=8
    )
    
    content = ''
    for chunk in response:
        content += (chunk.choices[0].delta.content or "")
    print('AI says:', content)
    return compare_result_parser(content)


def git_repo_case(git_url, expected_commit_message):
    target_repo_dir = '/tmp/commit_test/cases'
    
    ui_processed = 0
    stdout_result = ''
    current_directory = ''
    code_diff = ''
    
    def input_mock(output):
        nonlocal stdout_result
        nonlocal ui_processed
        stdout_result += output + '\n'
        
        ui_blocks = ui_parser.parse_ui_description(stdout_result)
        input_dict = {}
        while ui_processed < len(ui_blocks):
            ui_processed += 1
            for block in ui_blocks[ui_processed-1]:
                if block['type'] == 'checkbox':
                    for item in block['items']:
                        input_dict[item['id']] = 'checked'
                if block['type'] == 'radio':
                    input_dict[block['items'][0]['id']] = 'checked'
                if block['type'] == 'editor':
                    input_dict[block['id']] = block['text']
        
        return (
            '```yaml\n'
            f'{yaml.dump(input_dict)}\n'
            '```\n') if input_dict.keys() else None

    def assert_result():
        nonlocal expected_commit_message
        nonlocal git_url
        _1, commit_hash, _1 = extract_repo_info(git_url)
        # get last commit message by git log
        commit_message = get_last_commit_message()
        # does last commit message match expected commit message?
        print('expect:', expected_commit_message)
        print('actual:', commit_message)
        better_one = commit_message_compare(expected_commit_message, commit_message, diff_of_commit(os.getcwd(), commit_hash))
        return better_one == 'right' or better_one == 'second'
        # print('AI says better one is:', better_one)
        # return commit_message and commit_message == expected_commit_message

    def setup():
        nonlocal git_url
        nonlocal target_repo_dir
        nonlocal current_directory
        if os.path.exists(target_repo_dir):
            shutil.rmtree(target_repo_dir)
        repo_path = clone_and_reset(git_url, target_repo_dir)
        if not repo_path:
            return False
        # save current directory to current_directory
        current_directory = os.getcwd()
        # set current directory to repo_path
        os.chdir(repo_path)
        return True
        
    def teardown():
        nonlocal target_repo_dir
        nonlocal current_directory
        # remove target repo directory
        shutil.rmtree(target_repo_dir)
        # reset current directory
        os.chdir(current_directory)

    return {
        'input': '/commit',
        'title': f'commit {git_url}',
        'input_mock': input_mock,
        'assert': assert_result,
        'setup': setup,
        'teardown': teardown
    }


def case1():
    input_pattern = [
        (
            'workflow_test.py',
            ('```yaml\n'
             'workflow_test.py: checked\n'
             '```\n')
        ), (
            'editor01',
            ('```yaml\n'
             'editor0: commit message\n'
             '```\n')
        )]
    current_input_index = 0
    last_commit_id = None

    def input_mock(output):
        nonlocal current_input_index
        nonlocal input_pattern
        if current_input_index < len(input_pattern):
            if output.find(input_pattern[current_input_index][0]) > 0:
                current_input_index += 1
                return input_pattern[current_input_index - 1][1]
        return None
    def assert_result():
        # get last commit message by git log
        commit_message = get_last_commit_message()
        return commit_message and commit_message == 'commit message'

    def setup():
        nonlocal last_commit_id
        last_commit_id = get_last_commit_id()
        
    def teardown():
        nonlocal last_commit_id
        current_commit_id = get_last_commit_id()
        if current_commit_id != last_commit_id:
            reset_last_commit()

    return {
        'input': '/commit',
        'title': 'commit local repo',
        'input_mock': input_mock,
        'assert': assert_result,
        'setup': setup,
        'teardown': teardown
    }

def get_cases():
    return [
        git_repo_case(
            git_url = 'https://github.com/ThatEidolon/Python/commit/d515ad1303d3043e8e9c8c611020b85252d958f6',
            expected_commit_message = 'adding sending function and parsing actions'
        )
    ]
