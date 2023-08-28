import { Button, Anchor } from "@mantine/core";
import React from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { okaidia } from "react-syntax-highlighter/dist/esm/styles/prism";
import CodeButtons from "./CodeButtons";
import { observer } from "mobx-react-lite";
import { useMst } from "@/views/stores/RootStore";
import { Message } from "@/views/stores/ChatStore";
import messageUtil from '@/util/MessageUtil';

interface IProps {
    messageText: string
}

const MessageMarkdown = observer((props: IProps) => {
    const { messageText } = props;
    const { chat } = useMst();

    const LanguageCorner = (props: any) => {
        const { language } = props;

        return (<div style={{ position: 'absolute', top: 0, left: 0 }}>
            {language && (
                <div style={{
                    backgroundColor: '#333',
                    color: '#fff',
                    padding: '0.2rem 0.5rem',
                    borderRadius: '0.2rem',
                    fontSize: '0.8rem',
                }}>
                    {language}
                </div>
            )}
        </div>);
    };

    const handleExplain = (value: string | undefined) => {
        console.log(value);
        switch (value) {
            case "#ask_code":
                chat.addMessages([
                    Message.create({
                        type: 'user',
                        message: 'Explain /ask_code'
                    }),
                    Message.create({
                        type: 'bot',
                        message: `***/ask_code***

If you would like to ask questions related to your own codebase, you can enable and use the /ask_code feature of DevChat.

While /ask_code is being enabled, DevChat will need to index your codebase before you can use this feature. Indexing usually takes a while, depending on the size of your codebase, your computing power and the network. Once it’s done, you can ask questions about your codebase by typing the “/ask_code” command, followed by your question.

Example questions:
(Here we only show example questions from a few popular open-source projects’ codebases.)

How do I access POST form fields in Express?
How do I pass command line arguments to a Node.js program?
How do I print the value of a tensor object in TensorFlow?
How do I force Kubernetes to re-pull an image in Kubernetes?
How do I set focus on an input field after rendering in React?

\`Please check DevChat.ask_code settings\` before enabling the feature, because once indexing has been started, changing the settings will not affect the process anymore, unless if you terminate it and re-index.

To enable, you can enter \`DevChat:Start AskCode Index\` in the Command Palette or click on the button to start indexing now.
              
<button value="settings">Settings</button>
<button value="start_indexing">Start Indexing</button>
                        `
                    }),
                ]);
                break;
            case '#code':
                chat.addMessages([
                    Message.create({
                        type: 'user',
                        message: 'Explain /code'
                    }),
                    Message.create({
                        type: 'bot',
                        message: `***/code***

Use this DevChat workflow to request code writing. Please input your specific requirements and supply the appropriate context for implementation. You can select the relevant code or files and right-click to "Add to DevChat". If you find the context is still insufficient, you can enhance my understanding of your code by providing class/function definitions of the selected code. To do this, click the "+" button for the selected code and choose "symbol definitions". Please note, it may take a few seconds for this information to appear in DevChat.
                    `
                    }),
                ]);
                break;
            case '#commit_message':
                chat.addMessages([
                    Message.create({
                        type: 'user',
                        message: 'Explain /commit_message'
                    }),
                    Message.create({
                        type: 'bot',
                        message: `***/commit_message***
    
Use this DevChat workflow to request a commit message. Generally, you don't need to type anything else, but please give me the output of \`git diff\`. Of course, you don't need to manually execute the command and copy & paste its output. Simply click the "+" button and select \`git diff —cached\` to include only the staged changes, or \`git diff HEAD\` to include all changes.
                        `
                    }),
                ]);
                break;
            case '#release_note':
                chat.addMessages([
                    Message.create({
                        type: 'user',
                        message: 'Explain /release_note'
                    }),
                    Message.create({
                        type: 'bot',
                        message: `***/release_note***
        
Generate a professionally written and formatted release note in markdown with this workflow. I just need some basic information about the commits for the release. Add this to the context by clicking the "+" button and selecting \`git_log_releasenote\`. If the scope of commits differs from the default command, you can also select \`<custom command>\` and input a command line such as \`git log 579398b^..HEAD --pretty=format:"%h - %B"\` to include the commit 579398b (inclusive) up to the latest.
                            `
                    }),
                ]);
                break;
            case "#settings":
                messageUtil.sendMessage({ command: 'doCommand', content: ['workbench.action.openSettings', 'DevChat'] });
                break;
        }
        chat.goScrollBottom();
    };
    const handleButton = (value: string | number | readonly string[] | undefined) => {
        switch (value) {
            case "settings": messageUtil.sendMessage({ command: 'doCommand', content: ['workbench.action.openSettings', 'DevChat'] }); break;
            case "start_indexing": messageUtil.sendMessage({ command: 'doCommand', content: ['DevChat.AskCodeIndexStart'] }); break;
            case "setting_openai_key": messageUtil.sendMessage({ command: 'doCommand', content: ['workbench.action.openSettings', 'DevChat: Api_key_OpenAI'] }); break;
            case "setting_devchat_key": messageUtil.sendMessage({ command: 'doCommand', content: ['workbench.action.openSettings', 'DevChat: Access_key_DevChat'] }); break;
        }
    };

    return <ReactMarkdown
        rehypePlugins={[rehypeRaw]}
        components={{
            code({ node, inline, className, children, ...props }) {

                const match = /language-(\w+)/.exec(className || '');
                const value = String(children).replace(/\n$/, '');
                const lanugage = match && match[1];

                let wrapLongLines = false;
                if (lanugage === 'markdown' || lanugage === 'text') {
                    wrapLongLines = true;
                }
                return !inline && lanugage ? (
                    <div style={{ position: 'relative' }}>
                        <LanguageCorner language={lanugage} />
                        <CodeButtons language={lanugage} code={value} />
                        <SyntaxHighlighter {...props}
                            language={lanugage}
                            customStyle={{ padding: '3em 1em 1em 2em' }}
                            style={okaidia}
                            wrapLongLines={wrapLongLines}
                            PreTag="div">
                            {value}
                        </SyntaxHighlighter>
                    </div >
                ) : (
                    <code {...props} className={className}>
                        {children}
                    </code>
                );
            },
            button({ node, className, children, value, ...props }) {
                return (
                    <Button
                        size='xs'
                        sx={{
                            backgroundColor: 'var(--vscode-button-background)',
                        }}
                        styles={{
                            icon: {
                                color: 'var(--vscode-button-foreground)'
                            },
                            label: {
                                color: 'var(--vscode-button-foreground)',
                                fontSize: 'var(--vscode-editor-font-size)',
                            }
                        }}
                        onClick={() => {
                            handleButton(value);
                        }}>
                        {children}
                    </Button>
                );
            },
            a({ node, className, children, href, ...props }) {
                const customAnchors = ["#code",
                    "#commit_message",
                    "#release_note",
                    "#ask_code",
                    "#extension",
                    "#settings"].filter((item) => item === href);
                return customAnchors.length > 0
                    ? <Anchor href={href} onClick={() => {
                        handleExplain(href);
                    }}>
                        {children}
                    </Anchor>
                    : <a {...props} href={href} className={className}>
                        {children}
                    </a>;
            }
        }}>
        {messageText}
    </ReactMarkdown >;
});

export default MessageMarkdown;