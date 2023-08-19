<div align="center">
<br/>
<img src="assets/devchat.png" width="100px" alt="">
<br/>

# DevChat Visual Studio Code Extension

</div>
<br>
<div align="left">

[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com)
[![VS Code Marketplace Version](https://img.shields.io/visual-studio-marketplace/v/merico.devchat?logo=visual-studio-code)](https://marketplace.visualstudio.com/items?itemName=merico.devchat)
[![VS Code Marketplace Downloads](https://img.shields.io/visual-studio-marketplace/d/merico.devchat?logo=visual-studio-code)](https://marketplace.visualstudio.com/items?itemName=merico.devchat)
[![GitHub license](https://img.shields.io/github/license/devchat-ai/devchat-vscode.svg)](https://github.com/devchat-ai/devchat-vscode/blob/main/LICENSE)
[![Discord Chat](https://img.shields.io/discord/1106908489114206309?logo=discord)](https://discord.gg/9t3yrbBUXD)

👉 Install [Visual Studio Code extension](https://github.com/devchat-ai/devchat-vscode) from [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=merico.devchat) and enjoy DevChat 👏

  
***

## What is DevChat?

DevChat is an open-source platform that empowers developers to leverage AI for code generation and documentation. We aim to go beyond simple code auto-completion and limited operations on code snippets. DevChat offers a highly *practical* and *effective* way for developers to interact and collaborate with large language models (LLMs).

## Our Insights

While there are many AI coding tools available, we created DevChat based on our insights gained from generating tens of thousands of lines of code. If you agree with our perspectives outlined below, DevChat could be the perfect choice for you.

- **The value of prompt "engineering" is often overstated**. While a well-crafted prompt template is helpful, it doesn't justify spending days or weeks of study. Instead, dedicate an hour or two to create a few effective templates and share them with your team.
- The art of writing prompts is a skill honed through practice. It's not about templates or engineering, but about **refining individual prompts for specific tasks on a case-by-case basis**.
- **The bottleneck in harnessing AI's capabilities lies in how to embed the right context in a prompt**. This isn't merely about the token limit of an AI model's input. Even with an infinite number of tokens, existing AI models would struggle to yield satisfactory results without a proper separation of concerns.
- **Use AI only when it truly adds value**. Our misconception about AI's capabilities in reality is even a greater issue than hallucination of LLMs. What we need is a tool that boosts productivity, not merely an experiment.

## Our Features

In alignment with our insights, DevChat incorporates the following design choices:
- **Precise control over the context embedded in a prompt**. This isn't a feature to be overlooked in the quest for greater intelligence or autonomy. Precise control over context is crucial for effective AI use. In our view, most other tools tend to over-guess what a user needs to put into the context of a prompt. This typically introduces more noise than LLMs can effectively manage.
- **A simple, extensible prompt directory**. This enables developers or teams to easily integrate their own predefined prompt templates into DevChat, avoiding significant engineering effort or a steep learning curve. You don't need a complex framework to make AI work for you. All it takes is a standard editor operating on your filesystem.

### Context Building

Great output requires great input, to maximize the power of AI, DevChat assists you seamlessly to **provide the right context** to the AI.

- The most fundamental operation involves selecting code (either files or snippets) and adding it to DevChat. For instance, you can add a function along with an existing test case to the prompt context, and ask DevChat to generate several test cases for the function. The test case serves as a useful reference for DevChat, enabling it to understand how to write a valid test case in your environment, thus eliminating the need for you to specify every requirement or setup in your prompt.

    ![Add to context](https://github.com/devchat-ai/devchat-vscode/assets/592493/9b19c798-d06f-4373-8f8a-6a950c3a8ba5)

- You can incorporate the output of any command, such as `tree ./src`, into a prompt with DevChat. For example, you can add the output of `git diff --cached` to DevChat, which can then generate a commit message for you.

    ![Generate a commit message](https://github.com/devchat-ai/devchat-vscode/assets/592493/7bd34547-762c-4f97-b792-8d05a9eb1dcf)

- Program analysis can assist in building the necessary context. Suppose you want DevChat to explain some code to you. DevChat can perform better if it's aware of the dependent functions that the code calls. In this scenario, you select the target code to explain and add "symbol definitions" to the context. DevChat will then generate a prompt that explains the target code, taking into account the dependent functions.

### Prompt Extension

DevChat utilizes a directory to manage predefined prompt templates. You can easily add your own or modify existing ones using a text editor. Let's delve into the directory structure and its functionality.

#### Location

By default, the directory is named `workflows` and located in the `.chat` folder at the root of your project. If you're working on a project in VS Code, you can run `ls .chat/workflows` in a terminal to see what's inside.

#### Paths

The `workflows` directory contains three subdirectories, `sys`, `org`, and `usr`. The `sys` (system) directory is a clone of https://github.com/devchat-ai/workflows, which contains the default templates. You can overwrite those system prompts. For instance, if you create `commit_message` in the `usr` directory and define your own `prompt.txt`, DevChat will use your version instead of the default one in `sys`.

```
workflows
├── sys
│   └── commit_message
│       └── prompt.txt
└── usr
    └── commit_message
        └── prompt.txt
```

In addition to `sys` and `usr`, the `org` directory is reserved for team-wise conventions. Your team can maintain a Git repository to store prompts in `org`, and every team member can locally sync `org` with the repository. Those prompts will overwrite those in `sys`, while you can still further customize them for yourself by providing any in `usr`.

#### Names

You can utilize a prompt template by typing a "command" with the corresponding name in the DevChat input. Type `/` followed by the command name.

The `/`-separated path to the prompt directory in `usr` corresponds to a `.`-separated command name to incorporate the `prompt.txt` file in the directory. For example, `path/to/dir` is represented as `/path.to.dir` for the DevChat input.

Note that `sys`, `org`, or `usr` do not need to be included in a command name. DevChat will first look up the corresponding path under `usr`, then `org`, and finally `sys`.

## Inheritance

By default, a command will incorporate the `prompt.txt` file in the corresponding directory and all the `prompt.txt` files in the parent and ancestor directories. For example, if you want to write a general `code` template with specific requirements for different programming languages, the prompts can be organized as follows:

```
workflows
└── usr
    └── code
        ├── prompt.txt
        ├── go
        │   └── prompt.txt
        ├── js
        │   └── prompt.txt
        └── py
            └── prompt.txt
```

When you type `/code.py` in DevChat, it will include both `prompt.txt` in `usr/code/` and `prompt.txt` in `usr/code/py/`. This structure aligns with our `sys` directory. You can refer to the contents of sys/code/prompt.txt and sys/code/py/prompt.txt for more details.

## Quick Start

> Chinese: [中文安装配置指南](https://zh.devchat.blog/devchat-vscode-installation-guide).

  - Install [Visual Studio Code](https://code.visualstudio.com/download).
  - Open the Extensions view (⇧⌘X), search for DevChat, and install the extension:
  
  &nbsp; &nbsp; <img width="220" alt="image" src="https://github.com/devchat-ai/devchat-vscode/assets/592493/c30f76fe-321a-4145-88fa-a0ef3d36bde5">

  - Click on the DevChat icon in the status bar. If the API key is not set, DevChat will prompt you to enter it. Simply input your OpenAI's key.

  &nbsp; &nbsp; <img width="400" alt="image" src="https://github.com/devchat-ai/devchat-vscode/assets/592493/56f261c0-3aae-4df6-b699-c9e757bd91c1">

  - We recommend dragging the DevChat logo from the left sidebar to **the right sidebar** to avoid overlapping with the Explorer.

## Community

- Join our [Discord](https://discord.gg/9t3yrbBUXD)!
- Participate in [discussions](https://github.com/devchat-ai/devchat/discussions)!

## What is Prompt-Centric Software Development (PCSD)?

- The traditional code-centric paradigm is evolving.

- Write prompts to create code. Transform prompts into all the artifacts in software engineering.

  <img width="600" alt="image" src="https://github.com/devchat-ai/devchat/assets/592493/dd32e900-92fd-4fa4-8489-96ed17ab5e0e">

  <sub>(This image is licensed by devchat.ai under a <a rel="license" href="http://creativecommons.org/licenses/by-sa/4.0/">Creative Commons Attribution-ShareAlike 4.0 International License</a>.)</sub>
  
- We like to call it DevPromptOps
  
  <img width="500" alt="image" src="https://github.com/devchat-ai/devchat/assets/592493/e8e1215b-53b0-4473-ab00-0665d33f204a">
  
  <sub>(This image is licensed by devchat.ai under a <a rel="license" href="http://creativecommons.org/licenses/by-sa/4.0/">Creative Commons Attribution-ShareAlike 4.0 International License</a>.)</sub>

## Contributing

Issues and pull request are welcome: 
- https://github.com/devchat-ai/devchat/issues
- https://github.com/devchat-ai/devchat-vscode/pulls

## Contact Information
  
hello@devchat.ai

We are creators of [Apache DevLake](https://devlake.apache.org/).
