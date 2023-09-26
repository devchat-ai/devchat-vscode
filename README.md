<div align="center">
<br/>
<img src="assets/devchat.png" width="100px" alt="">
<br/>

# DevChat Visual Studio Code Extension

**The Truly Collaboartive AI Coding Assistant. The Best of AI. The Best of You. Integrated Seamlessly.**

🛠️ AI integrated where you want it, when you need it, with no disruption to your flow.

☕ Intuitive and simple to use, no more wrestling with complicated prompt engineering.

🍻 Designed with extensibility and personalization prioritized.

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

DevChat is an open-source platform that empowers developers to more naturally and effectively integrate AI into code generation and documentation. DevChat aims to go beyond simple auto-completion and limited operations on code snippets. DevChat offers a highly *practical* and *effective* way for developers to interact and collaborate with large language models (LLMs), DevChat is the tool that works for you, no need to change your workflow.

## Why DevChat?

We spent years on code analysis, static-analysis, and DevOps improvements, working with hundreds of companies around the world. The insights we have picked up in this process are all incorporated into DevChat. The techniques, approaches, and decisions that drive success for companies large and small inform every detail of DevChat. You'll find some distinctive design choices:

- **Precise manual control over the context embedded in a prompt**. DevChat won't create new work for you, because it ensures that context drives everything. Precise control over context is the key to effective AI use. We find that most other "intelligent" or "automatic" tools tend to over-guess what a user needs to put into a prompt. That typically introduces more noise than LLMs can effectively manage. 
- **A simple, extensible prompt directory**. Bring your own prompts, and build a library of what works for you and your team. Easily integrate your own prompt templates into DevChat, avoiding significant engineering effort or a steep learning curve. You don't need a complex framework to make AI work for you. All it takes is a standard editor operating on your filesystem. No more redundant work. No more re-inventing the wheel. 

## Feature Overview

### Context Building

Great output requires great input. To maximize the power of AI, DevChat assists you seamlessly to **provide the most effective context** to AI to ensure you get impactful outcomes.

- For instance, to generate test cases for a function, you can add to the prompt the function along with an existing test case. The test case serves as a useful reference for DevChat, enabling it to understand how to write a valid test case specific to your environment, thus eliminating the need for you to specify every requirement in your prompt. DevChat just "gets it." 

  ![Add to context](https://github.com/devchat-ai/devchat-vscode/assets/592493/9b19c798-d06f-4373-8f8a-6a950c3a8ba5)

- You can incorporate the output of any command, such as `tree ./src`, into a prompt with DevChat. For example, you can add the output of `git diff --cached` to DevChat, which can then generate a useful commit message for you.

  ![Generate a commit message](https://github.com/devchat-ai/devchat-vscode/assets/592493/7bd34547-762c-4f97-b792-8d05a9eb1dcf)

- Program analysis can assist in building the necessary context. Suppose you want DevChat to explain some code to you. DevChat can perform better if it's aware of the dependent functions that the code is calling. In this scenario, you can select the target code with DevChat to explain and add "symbol definitions" to the context (by clicking the plus button). DevChat will then generate a prompt that explains the target code, taking into account the dependent functions. No generic explainers. 

### Prompt Extension

DevChat utilizes a directory to manage predefined prompt templates. You can easily add your own or modify existing ones using a text editor.
By default, the directory is named `workflows` and located in the `.chat` folder at your home directory. You can run `ls ~/.chat/workflows` in a terminal to see what's inside.

The `workflows` directory typically contains three subdirectories, `sys`, `org`, and `usr`. The `sys` (system) directory is a clone of https://github.com/devchat-ai/workflows, which contains the default prompt templates. You can overwrite those system prompts. For instance, if you create `commit_message` in the `usr` directory and define your own `prompt.txt`, DevChat will use your version instead of the default in `sys` or `org`.

  ```
  workflows
  ├── sys
  │   └── commit_message
  │       └── prompt.txt
  ├── org
  │   └── commit_message
  │       └── prompt.txt
  └── usr
      └── commit_message
          └── prompt.txt
  ```

The `org` directory is useful for cleanly maintaining team-wise conventions or requirements. Your team can share a Git repository to store prompts in `org`, and every team member can locally sync `~/.chat/workflows/org` with the repository. The `org` prompts will overwrite those in `sys`, while an individual developer can then further customize them in `usr`.

You can incorporate a template in your prompt by typing a "command" with the corresponding name in the DevChat input. Type `/` followed by the command name, as shown below. The `/`-separated path to the prompt directory corresponds to a `.`-separated command name. For instance, if you want to embed the 'prompt.txt' file located in `path/to/dir` into your current prompt, you should type `/path.to.dir` into the DevChat input field, along with the other content of the prompt. Note that `sys`, `org`, or `usr` do not need to be included in a command name. DevChat will first look up the corresponding path under `usr`, then `org`, and finally `sys`.

  <img width="386" alt="image" src="https://github.com/devchat-ai/devchat-vscode/assets/592493/145d94eb-a3e8-42ca-bb88-a462b6070b2f">


## Quick Start

  - Install [Visual Studio Code](https://code.visualstudio.com/download).
  - Open the Extensions view (⇧⌘X), search for DevChat, and install the extension:
  
  &nbsp; &nbsp; <img width="220" alt="image" src="https://github.com/devchat-ai/devchat-vscode/assets/592493/c30f76fe-321a-4145-88fa-a0ef3d36bde5">

  - Click on the DevChat icon in the status bar. If the API key is not set, DevChat will prompt you to enter it. Simply input your OpenAI's key.

  &nbsp; &nbsp; <img width="400" alt="image" src="https://github.com/devchat-ai/devchat-vscode/assets/592493/56f261c0-3aae-4df6-b699-c9e757bd91c1">

  - We recommend dragging the DevChat logo from the left sidebar to **the right sidebar** to avoid overlapping with the Explorer.

  - > Chinese Instructions (DevChat is global!): [中文安装配置指南](https://zh.devchat.blog/devchat-vscode-installation-guide).


## Community

- Join our [Discord](https://discord.gg/9t3yrbBUXD)!
- Participate in [discussions](https://github.com/devchat-ai/devchat/discussions)!

## What is Prompt-Centric Software Development (PCSD)?

- The traditional code-centric paradigm is evolving and changing rapidly, stay ahead of the curve with DevChat.

- Write prompts to create code. Transform prompts into all the artifacts you'll need in your engineering process.

  <img width="600" alt="image" src="https://github.com/devchat-ai/devchat/assets/592493/dd32e900-92fd-4fa4-8489-96ed17ab5e0e">

  <sub>(This image is licensed by devchat.ai under a <a rel="license" href="http://creativecommons.org/licenses/by-sa/4.0/">Creative Commons Attribution-ShareAlike 4.0 International License</a>.)</sub>
  
- We like to call it "DevPromptOps" (we know, it rolls right off the tongue ;-) ) 
  
  <img width="500" alt="image" src="https://github.com/devchat-ai/devchat/assets/592493/e8e1215b-53b0-4473-ab00-0665d33f204a">
  
  <sub>(This image is licensed by devchat.ai under a <a rel="license" href="http://creativecommons.org/licenses/by-sa/4.0/">Creative Commons Attribution-ShareAlike 4.0 International License</a>.)</sub>

## Contributing

Issues and pull request are welcome: 
- https://github.com/devchat-ai/devchat/issues
- https://github.com/devchat-ai/devchat-vscode/pulls

## Contact Information
  
hello@devchat.ai

Made by the same team that created and maintains [Apache DevLake](https://devlake.apache.org/).
