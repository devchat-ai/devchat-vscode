import { Button, Anchor } from "@mantine/core";
import React from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { okaidia } from "react-syntax-highlighter/dist/esm/styles/prism";
import CodeButtons from "./CodeButtons";

interface IProps {
    messageText: string
}

const MessageMarkdown = (props: IProps) => {
    const { messageText } = props;

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

    return <ReactMarkdown
        rehypePlugins={[rehypeRaw]}
        components={{
            code({ node, inline, className, children, ...props }) {

                const match = /language-(\w+)/.exec(className || '');
                const value = String(children).replace(/\n$/, '');

                return !inline && match ? (
                    <div style={{ position: 'relative' }}>
                        <LanguageCorner language={match[1]} />
                        <CodeButtons language={match[1]} code={value} />
                        <SyntaxHighlighter {...props} language={match[1]} customStyle={{ padding: '3em 1em 1em 2em', }} style={okaidia} PreTag="div">
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
                            console.log(value);
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
                    "#extension"].filter((item) => item === href);
                return customAnchors.length > 0
                    ? <Anchor href={href} onClick={() => {
                        console.log(href);
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
};

export default MessageMarkdown;