import { Tooltip, ActionIcon, CopyButton, Flex } from "@mantine/core";
import { IconCheck, IconGitCommit, IconFileDiff, IconColumnInsertRight, IconReplace, IconCopy } from "@tabler/icons-react";
import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { okaidia } from "react-syntax-highlighter/dist/esm/styles/prism";

import messageUtil from '../../util/MessageUtil';

const CodeBlock = (props: any) => {
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

    const CodeButtons = (props: any) => {
        const { language, code } = props;

        const CommitButton = () => {
            const [commited, setCommited] = useState(false);
            return (<Tooltip sx={{ padding: '3px', fontSize: 'var(--vscode-editor-font-size)' }} label={commited ? 'Committing' : 'Commit'} withArrow position="left" color="gray">
                <ActionIcon size='xs'
                    color={commited ? 'teal' : 'gray'}
                    onClick={() => {
                        messageUtil.sendMessage({
                            command: 'doCommit',
                            content: code
                        });
                        setCommited(true);
                        setTimeout(() => { setCommited(false); }, 2000);
                    }}>
                    {commited ? <IconCheck size="1rem" /> : <IconGitCommit size="1rem" />}
                </ActionIcon>
            </Tooltip>);
        };

        const DiffButton = () => {
            return (<Tooltip sx={{ padding: '3px', fontSize: 'var(--vscode-editor-font-size)' }} label='View Diff' withArrow position="left" color="gray">
                <ActionIcon size='xs' onClick={() => {
                    messageUtil.sendMessage({
                        command: 'show_diff',
                        content: code
                    });
                }}>
                    <IconFileDiff size="1.125rem" />
                </ActionIcon>
            </Tooltip>);
        };

        const CodeApplyButton = () => {
            return (<Tooltip sx={{ padding: '3px', fontSize: 'var(--vscode-editor-font-size)' }} label='Insert Code' withArrow position="left" color="gray">
                <ActionIcon size='xs' onClick={() => {
                    messageUtil.sendMessage({
                        command: 'code_apply',
                        content: code
                    });
                }}>
                    <IconColumnInsertRight size="1.125rem" />
                </ActionIcon>
            </Tooltip>);
        };

        const FileApplyButton = () => {
            return (<Tooltip sx={{ padding: '3px', fontSize: 'var(--vscode-editor-font-size)' }} label='Replace' withArrow position="left" color="gray">
                <ActionIcon size='xs' onClick={() => {
                    messageUtil.sendMessage({
                        command: 'code_file_apply',
                        content: code
                    });
                }}>
                    <IconReplace size="1.125rem" />
                </ActionIcon>
            </Tooltip>);
        };

        const CodeCopyButton = () => {
            return (<CopyButton value={code} timeout={2000}>
                {({ copied, copy }) => (
                    <Tooltip sx={{ padding: '3px', fontSize: 'var(--vscode-editor-font-size)' }} label={copied ? 'Copied' : 'Copy'} withArrow position="left" color="gray">
                        <ActionIcon size='xs' color={copied ? 'teal' : 'gray'} onClick={copy}>
                            {copied ? <IconCheck size="1rem" /> : <IconCopy size="1rem" />}
                        </ActionIcon>
                    </Tooltip>
                )}
            </CopyButton>);
        };

        return (
            <Flex
                gap="5px"
                justify="flex-start"
                align="flex-start"
                direction="row"
                wrap="wrap"
                style={{ position: 'absolute', top: 8, right: 10 }}>
                <CodeCopyButton />
                {language && language === 'commitmsg'
                    ? <CommitButton />
                    : (<>
                        <DiffButton />
                        <CodeApplyButton />
                        <FileApplyButton />
                    </>)}
            </Flex>
        );
    };

    return (
        <ReactMarkdown
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
    );
};

export default CodeBlock;