
"""
checkbox:
```chatmark type=form
Which files would you like to commit? I've suggested a few.
> [x](file1) devchat/engine/prompter.py
> [x](file2) devchat/prompt.py
> [](file3) tests/test_cli_prompt.py
```

radio:
```chatmark type=form
How would you like to make the change?
> - (insert) Insert the new code.
> - (new) Put the code in a new file.
> - (replace) Replace the current code.
```

editor:
```chatmark type=form
I've drafted a commit message for you as below. Feel free to modify it.

> | (ID)
> fix: prevent racing of requests
>
> Introduce a request id and a reference to latest request. Dismiss
> incoming responses other than from latest request.
>
> Reviewed-by: Z
> Refs: #123
```
"""


import re

def extract_ui_blocks(text):
    # 定义用于提取各种UI块的正则表达式
    ui_block_pattern = re.compile(r'```chatmark type=form\n(.*?)\n```', re.DOTALL)
    return ui_block_pattern.findall(text)

def parse_ui_block(block):
    # 解析checkbox
    result = []
    checkbox_pattern = re.compile(r'> \[(x|)\]\((.*?)\)')
    checkboxes = checkbox_pattern.findall(block)
    if checkboxes:
        result.append({
            'type': 'checkbox',
            'items': [{'checked': bool(x.strip()), 'id': file_id} for x, file_id in checkboxes]
        })

    # 解析radio
    radio_pattern = re.compile(r'> - \((.*?)\)')
    radios = radio_pattern.findall(block)
    if radios:
        result.append({
            'type': 'radio',
            'items': [{'id': radio_id} for radio_id in radios]
        })

    # 解析editor
    editor_pattern = re.compile(r'> \| \((.*?)\)\n((?:> .*\n?)*)', re.DOTALL)
    editor_match = editor_pattern.search(block)
    if editor_match:
        editor_id = editor_match.group(1)
        editor_text = editor_match.group(2).strip().replace('> ', '')
        result.append({
            'type': 'editor',
            'id': editor_id,
            'text': editor_text
        })

    return result

def parse_ui_description(text):
    # 提取所有UI块
    blocks = extract_ui_blocks(text)
    # 解析每个UI块并返回结果
    return [parse_ui_block(block) for block in blocks if parse_ui_block(block)]


def test_ui():
    description = """
checkbox:
```chatmark type=form
Which files would you like to commit? I've suggested a few.
> [x](file1) devchat/engine/prompter.py
> [x](file2) devchat/prompt.py
> [](file3) tests/test_cli_prompt.py
```

radio:
```chatmark type=form
How would you like to make the change?
> - (insert) Insert the new code.
> - (new) Put the code in a new file.
> - (replace) Replace the current code.
```

editor:
```chatmark type=form
I've drafted a commit message for you as below. Feel free to modify it.

> | (ID)
> fix: prevent racing of requests
>
> Introduce a request id and a reference to latest request. Dismiss
> incoming responses other than from latest request.
>
> Reviewed-by: Z
> Refs: #123
```

checkbox and radio:
```chatmark type=form
Which files would you like to commit? I've suggested a few.
> [x](file1) devchat/engine/prompter.py
> [x](file2) devchat/prompt.py
> [](file3) tests/test_cli_prompt.py

How would you like to make the change?
> - (insert) Insert the new code.
> - (new) Put the code in a new file.
> - (replace) Replace the current code.
```
    """

    parsed_data = parse_ui_description(description)
    for ui_element in parsed_data:
        print(ui_element)

