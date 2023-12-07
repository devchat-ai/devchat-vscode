import { Button, Anchor, Stack, Group, Box, createStyles } from "@mantine/core";
import React, { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { okaidia } from "react-syntax-highlighter/dist/esm/styles/prism";
import CodeButtons from "./CodeButtons";
import Step from "./Step";
import LanguageCorner from "./LanguageCorner";
import { observer } from "mobx-react-lite";
import { useMst } from "@/views/stores/RootStore";
import { Message } from "@/views/stores/ChatStore";
import messageUtil from '@/util/MessageUtil';
import {fromMarkdown} from 'mdast-util-from-markdown';
import {visit} from 'unist-util-visit';
import ChatMark from "@/views/components/ChatMark";
import { useSetState } from "@mantine/hooks";
import { toMarkdown } from "mdast-util-to-markdown";

const useStyles = createStyles((theme) => ({
    link:{
        '&:hover':{
            color:theme.colors.merico[6]
        }
    }
}));
interface MessageMarkdownProps extends React.ComponentProps<typeof ReactMarkdown> {
    children: string,
    className: string,
    messageDone?: boolean,
    temp?: boolean
}

type Step = {
    index: number,
    content: string;
    endsWithTripleBacktick: boolean;
};

function parseMetaData(string) {
    const regexp = /((?<k1>(?!=)\S+)=((?<v1>(["'`])(.*?)\5)|(?<v2>\S+)))|(?<k2>\S+)/g;    
    const io = (string ?? '').matchAll(regexp);

    return new Map(
        [...io]
        .map((item) => item?.groups)
        .map(({ k1, k2, v1, v2 }) => [k1 ?? k2, v1 ?? v2]),
    );
}

const MessageMarkdown = observer((props: MessageMarkdownProps) => {
    const { children,temp=false,messageDone } = props;
    const { chat } = useMst();
    const [steps, setSteps] = useState<Step[]>([]);
    const tree = fromMarkdown(children);
    const codes = tree.children.filter(node => node.type === 'code');    
    const lastNode = tree.children[tree.children.length-1];
    const [chatmarkValues,setChatmarkValues] = useSetState({});
    const {classes} = useStyles();

    const handleExplain = (value: string | undefined) => {
        console.log(value);
        switch (value) {
            case "#ask_code":
                chat.addMessages([
                    Message.create({
                        type: 'user',
                        message: 'Explain /ask-code'
                    }),
                    Message.create({
                        type: 'bot',
                        message: `***/ask-code***
                        
Ask anything about your codebase and get answers from our AI agent.

DevChat intelligently navigates your codebase using GPT-4. It automatically selects and analyzes up to ten most relevant source files to answer your question, all at an approximate cost of $0.4 USD. Stay tuned — we're soon integrating the more cost-efficient LLama 2 - 70B model.

Sample questions:
- Why does the lead time for changes sometimes show as null?
- How is store.findAllAccounts implemented?
- The recursive retriever currently drops any TextNodes and only queries the IndexNodes. It's a bug. How can we fix it?
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
            case "setting_openai_key": messageUtil.sendMessage({ command: 'doCommand', content: ['DevChat.AccessKey.OpenAI'] }); break;
            case "setting_devchat_key": messageUtil.sendMessage({ command: 'doCommand', content: ['DevChat.AccessKey.DevChat'] }); break;
        }
    };

    useEffect(()=>{
        let previousNode:any = null;
        let chatmarkCount = 0;
        visit(tree, function (node) {
            if (node.type === 'code') {
                // set meta data as props
                const metaData = parseMetaData(node.meta);
                let props = {...metaData};
                if(node.lang ==='chatmark' || node.lang ==='ChatMark'){
                    props['index'] = chatmarkCount;
                } else if ((node.lang === 'yaml' || node.lang === 'YAML') && previousNode && previousNode.type === 'code' && previousNode.lang === 'chatmark') {
                    setChatmarkValues({[`chatmark-${previousNode.data.hProperties.index}`]:node.value});
                }
                node.data={
                    hProperties:{
                        ...props
                    }
                };
                // record node and count data for next loop
                previousNode = node;
                if(node.lang ==='chatmark' || node.lang ==='ChatMark'){
                    chatmarkCount++;
                }
            }
        });
    },[children]);

    return <ReactMarkdown
        {...props}
        remarkPlugins={[()=> (tree) =>{
            let stepCount = 1;
            let chatmarkCount = 0;
            visit(tree, function (node) {
                if (node.type === 'code') {
                    // set meta data as props
                    const metaData = parseMetaData(node.meta);
                    let props = {...metaData};
                    if(node.lang ==='step' || node.lang ==='Step'){
                        props['index'] = stepCount;
                    } else if(node.lang ==='chatmark' || node.lang ==='ChatMark'){
                        props['id'] = `chatmark-${chatmarkCount}`;
                        props['index'] = chatmarkCount;
                    } 
                    node.data={
                        hProperties:{
                            ...props
                        }
                    };
                    // record node and count data for next loop
                    if(node.lang ==='chatmark' || node.lang ==='ChatMark'){
                        chatmarkCount++;
                    }
                    if(node.lang ==='step' || node.lang ==='Step'){
                        stepCount++;
                    }
                }
            });
        }]}

        rehypePlugins={[rehypeRaw]}
        components={{
            code({ node, inline, className, children, index,  ...props }) {

                const match = /language-(\w+)/.exec(className || '');
                const value = String(children).replace(/\n$/, '');
                let lanugage = match && match[1];
				if (!lanugage) {
					lanugage = "unknow";
				}

                let wrapLongLines = false;
                if (lanugage === 'markdown' || lanugage === 'text') {
                    wrapLongLines = true;
                }

                if (lanugage === 'step' || lanugage === 'Step') {
                    let done = Number(index) < codes.length? true : lastNode.type !== 'code';
                    return <Step language={lanugage} done={temp?done:true}>{value}</Step>;
                }

                if (lanugage === 'chatmark' || lanugage === 'ChatMark') {
                    const chatmarkValue = chatmarkValues[`chatmark-${index}`];
                    return <ChatMark value={chatmarkValue} messageDone={messageDone}>{value}</ChatMark>;
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
                        size="compact-xs" 
                        sx={{
                            backgroundColor:"#ED6A45",
                            fontFamily: 'var(--vscode-editor-font-familyy)',
                            fontSize: 'var(--vscode-editor-font-size)',
                            color:"#fff",
                            "&:hover":{
                                backgroundColor:"#ED6A45",
                                opacity: 0.8,
                            },
                            "&:focus":{
                                backgroundColor:"#ED6A45",
                                opacity: 0.8,
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
                    ? <Anchor
                        className={classes.link}
                        href={href} onClick={() => {
                        handleExplain(href);
                    }}>
                        {children}
                    </Anchor>
                    : <a {...props} href={href} className={className}>
                        {children}
                    </a>;
            }
        }
    }>
        {children}
    </ReactMarkdown >;
});

export default MessageMarkdown;