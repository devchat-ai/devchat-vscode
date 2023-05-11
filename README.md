# DevChat

![DevChat Logo](assets/devchat.png)

DevChat is a Visual Studio Code extension that allows you to chat with an AI-powered bot to help you with your coding tasks. Write prompts, not code.

## Features

- Chat with an AI-powered bot to get coding assistance
- Add code snippets or files to the chat for context
- Configure AI model settings

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
- `DevChat.logSkip`: Skip a number of prompts before showing the prompt history (default: 0).
- `DevChat.OpenAI.model`: Specify the AI model (default: "gpt-4").
- `DevChat.OpenAI.temperature`: Specify the AI model temperature (default: 0.2).
- `DevChat.OpenAI.stream`: Specify the AI model stream (default: true).
- `DevChat.OpenAI.tokensPerPrompt`: Specify the number of tokens for each prompt (default: 6000).
- `DevChat.OpenAI.useHistoryPrompt`: Use history prompts as context (default: true).
- `DevChat.OpenAI.apiKey`: OpenAI API Key (default: "").
- `DevChat.OpenAI.EndPoint`: OpenAI API server (default: "").

## Contributing

If you have any suggestions or issues, please feel free to open an issue or submit a pull request on the [GitHub repository](https://github.com/covespace/devchat-vscode.git).

## License

*Specify the license here*

## Contact Information

*Provide your contact information, such as an email address or a link to a GitHub repository*
