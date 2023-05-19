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
[![GitHub license](https://img.shields.io/github/license/covespace/devchat-vscode.svg)](https://github.com/covespace/devchat-vscode/blob/main/LICENSE)
[![Discord Chat](https://img.shields.io/discord/784885193774350337?logo=discord)](https://discord.gg/9t3yrbBUXD)

DevChat provides a Visual Studio Code extension, enabling you to interact with an AI-powered bot for coding assistance. Designed for **prompt-centric** software development, it allows you to create your own personalized dev copilot.

***

## What is DevChat?

DevChat is a powerful tool that helps you write prompts to generate code and documentation.
It is _not_ limited to performing predefined operations on short code snippets.
  
DevChat is the way developers interact and collaborate with AI.

:speech_balloon: Build the future with prompts, _not_ code.

## Why DevChat?

- To enable AI to write code, DevChat assists you in providing **the right context** for AI.
  
  Chat history, code, files, directory trees, `git diff --cached`, or the output of any command.

- To apply AI-generated code, DevChat streamlines your **actions to take**.

  View diffs, copy or insert, commit & sync, or export to documentation, wikis, and more.
  
- To guide AI in your work, define **your own workflows** with DevChat.
  
  Prompt templates, iterative calls to AI, and program operations.

- To suit your preferences, customize **your own experiences** with DevChat.
  
  Open-source, no waiting for opaque feature schedules. Access GPT-4 today and more models in the future.
  
## What is Prompt-Centric Software Development (PSSD)?

- The traditional code-centric paradigm is evolving.

- Write prompts to create code. Transform prompts into everything.

- It is DevPromptOps
  
  <img width="500" alt="image" src="https://github.com/covespace/devchat/assets/592493/e8e1215b-53b0-4473-ab00-0665d33f204a">


***

## Installation

1. Open Visual Studio Code
2. Press `Ctrl+P` to open the Quick Open dialog
3. Type `ext install merico.devchat` and press `Enter`
4. Install devchat package by `pip install devchat`
5. setting your OPENAI_API_KEY in setting/DevChat

## Usage

1. Open the chat panel by clicking on the "Chat with Bot" view in the Explorer or by running the "DevChat" command from the Command Palette (`Ctrl+Shift+P`).
2. Type your question or prompt in the input field and press `Enter` to send it to the AI bot.
3. To add code snippets or files to the chat, right-click on the selected code or file in the editor and choose "Add to DevChat" from the context menu.

## Configuration

You can configure the following settings in your `settings.json` file:

- `DevChat.llmModel`: Select the AI model to use (default: "OpenAI").
- `DevChat.maxLogCount`: Limit the number of prompts to output (default: 20).
- `DevChat.OpenAI.model`: Specify the AI model (default: "gpt-4").
- `DevChat.OpenAI.temperature`: Specify the AI model temperature (default: 0.2).
- `DevChat.OpenAI.stream`: Specify the AI model stream (default: true).
- `DevChat.OpenAI.tokensPerPrompt`: Specify the number of tokens for each prompt (default: 6000).
- `DevChat.OpenAI.useHistoryPrompt`: Use history prompts as context (default: true).
- `DevChat.OpenAI.apiKey`: OpenAI API Key (default: "").
- `DevChat.OpenAI.EndPoint`: OpenAI API server (default: "").

## Contributing

If you have any suggestions or issues, please feel free to open an issue or submit a pull request on the [GitHub repository](https://github.com/covespace/devchat-vscode.git).

## Automated Publishing Process

Check out our [Automated Publishing Process](./docs/publish.md) for a detailed walkthrough of how we manage the automated release of new versions for the DevChat VSCode Extension.


## Contact Information
  
hello@merico.dev
