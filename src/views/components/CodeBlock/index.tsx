import { Container } from "@mantine/core";
import React from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { okaidia } from "react-syntax-highlighter/dist/esm/styles/prism";
import CodeButtons from "./CodeButtons";

const CodeBlock = (props: any) => {
    const { messageText, messageType } = props;

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

    return (
        messageType === 'bot'
            ? <ReactMarkdown
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
                    }
                }}
            >
                {messageText}
            </ReactMarkdown >
            : <Container
                sx={{
                    margin: 0,
                    padding: 0,
                    pre: {
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                    },
                }}>
                <pre>{messageText}</pre>
            </Container>
    );
};

export default CodeBlock;