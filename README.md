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

DevChat is an open-source platform that empowers developers to leverage AI for code generation and documentation. We aim to go beyond simple code auto-completion and limited operations on brief code snippets. DevChat offers a highly *practical* and *effective* way for developers to interact and collaborate with large language models (LLMs).

## Why DevChat?

While there are many AI coding tools available, we created DevChat based on our unique insights gained from generating tens of thousands of lines of code. If you agree with our perspectives outlined below, DevChat could be the perfect choice for you.

- **The value of prompt "engineering" is often overestimated**. While a well-crafted prompt template can be helpful, it's not worth spending more than an hour or two to create a few effective ones and share them with your team.
- The art of writing prompts is a skill honed through practice. It's not about templates or engineering, but about **refining individual prompts for specific tasks on a case-by-case basis**.
- **The bottleneck in harnessing AI's capabilities lies in how to embed the right context in a prompt**. This isn't merely about the token limit of an AI model's input. Even with an infinite number of tokens, existing AI models would struggle to yield satisfactory results without a proper separation of concerns.
- **Use AI only when it truly adds value**. Our misconception about AI's capabilities is even a greater issue than hallucination of LLMs. What we need is a tool that boosts productivity, not merely an experimental tool.

In alignment with our perspectives, DevChat incorporates the following design choices:
- **A simple, extensible prompt directory**. This allows developers or teams to easily integrate their own predefined prompt snippets into DevChat, avoiding significant engineering effort or a steep learning curve. You don't need [LangChain](https://github.com/langchain-ai/langchain) to make AI work for you.
- **Precise, manual control over the context embedded in a prompt**. This isn't a feature to be overlooked in the quest for greater intelligence or autonomy. Just as manual driving remains a reliable choice until autonomous driving fully matures, manual control over context is crucial for effective AI use. In our view, [Sourcegraph Cody](https://marketplace.visualstudio.com/items?itemName=sourcegraph.cody-ai) tends to over-guess what a user needs to put into the context of a prompt, which exceeds the actual intelligence of the Claude model it employs.

## Explore Our Features

- Great output requires great input, to maximize the power of AI, DevChat assists you seamlessly to **provide the right context** to the AI.
    
  Chat history, code, files, directory trees, `git diff --cached`, or the output of any command.
  
  ![20230523-220717-cut-merged-1684855581224](https://github.com/devchat-ai/devchat-vscode/assets/592493/16bc09e4-4185-4bcb-8d5a-2173b0bfc3ed)

  ![20230523-220717-00 00 28 206-00 00 44 950](https://github.com/devchat-ai/devchat-vscode/assets/592493/d5556310-bc7f-4abb-86a3-8e76e4aa720e)  

Once you have generated code with AI, DevChat **streamlines the actions** to properly integrate and ship.
  
  View diffs, copy or insert, commit & sync, or export to documentation, wikis, and more.
  
  ![20230523-220717-00 00 46 728-00 01 00 120](https://github.com/devchat-ai/devchat-vscode/assets/592493/a2bab011-8e31-47a9-838f-36e43cd2e98c)

- To guide AI in your work, define **your own workflows** with DevChat.
  
  ![20230523-220717-00 01 14 614-00 01 41 680](https://github.com/devchat-ai/devchat-vscode/assets/592493/94502efd-781b-448d-b945-dffcc41d7af3)

  Explore more prompt templates, iterative calls to AI, and program operations.
  
## What is Prompt-Centric Software Development (PCSD)?

- The traditional code-centric paradigm is evolving.

- Write prompts to create code. Transform prompts into all the artifacts in software engineering.

  <img width="600" alt="image" src="https://github.com/devchat-ai/devchat/assets/592493/dd32e900-92fd-4fa4-8489-96ed17ab5e0e">

  <sub>(This image is licensed by devchat.ai under a <a rel="license" href="http://creativecommons.org/licenses/by-sa/4.0/">Creative Commons Attribution-ShareAlike 4.0 International License</a>.)</sub>
  
- We like to call it DevPromptOps
  
  <img width="500" alt="image" src="https://github.com/devchat-ai/devchat/assets/592493/e8e1215b-53b0-4473-ab00-0665d33f204a">
  
  <sub>(This image is licensed by devchat.ai under a <a rel="license" href="http://creativecommons.org/licenses/by-sa/4.0/">Creative Commons Attribution-ShareAlike 4.0 International License</a>.)</sub>

***

## Quick Start

> Chinese: [中文安装配置指南](https://zh.devchat.blog/devchat-vscode-installation-guide).

  - Install [Visual Studio Code](https://code.visualstudio.com/download).
  - Open the Extensions view (⇧⌘X), search for DevChat, and install the extension:
  
  &nbsp; &nbsp; <img width="220" alt="image" src="https://github.com/devchat-ai/devchat-vscode/assets/592493/c30f76fe-321a-4145-88fa-a0ef3d36bde5">

  - Since DevChat is designed for developers, it requires a Git or SVN repository folder to store metadata. Therefore, be sure to open a Git or SVN project.
  - Set your [OpenAI API Key](https://platform.openai.com/account/api-keys) by running `export OPENAI_API_KEY="[sk-...]"` (or set it to your DevChat access key instead).
  - Click on the DevChat icon in the status bar. If the API key setting is not configured, it will prompt you to enter it. Simply input the key.

  &nbsp; &nbsp; <img width="400" alt="image" src="https://github.com/devchat-ai/devchat-vscode/assets/592493/56f261c0-3aae-4df6-b699-c9e757bd91c1">

  - We recommend dragging the DevChat logo from the left sidebar to **the right sidebar** to avoid overlapping with the Explorer.

## Community

- Join our [Discord](https://discord.gg/9t3yrbBUXD)!
- Participate in [discussions](https://github.com/devchat-ai/devchat/discussions)!

## Contributing

Issues and pull request are welcome: 
- https://github.com/devchat-ai/devchat/issues
- https://github.com/devchat-ai/devchat-vscode/pulls

## Automated Publishing Process

Check out our [Automated Publishing Process](./docs/publish.md) for a detailed walkthrough of how we manage the automated release of new versions for the DevChat VSCode Extension.

## Contact Information
  
hello@devchat.ai

We are creators of [Apache DevLake](https://devlake.apache.org/).
