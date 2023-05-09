import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { Avatar, Center, Container, CopyButton, Divider, Flex, Grid, Stack, Textarea, TypographyStylesProvider } from '@mantine/core';
import { Input, Tooltip } from '@mantine/core';
import { List } from '@mantine/core';
import { ScrollArea } from '@mantine/core';
import { createStyles, keyframes } from '@mantine/core';
import { ActionIcon } from '@mantine/core';
import { Menu, Button, Text } from '@mantine/core';
import { useListState, useViewportSize } from '@mantine/hooks';
import { IconCheck, IconClick, IconCopy, IconEdit, IconFolder, IconGitCompare, IconMessageDots, IconRobot, IconSend, IconSquareRoundedPlus, IconUser } from '@tabler/icons-react';
import { IconSettings, IconSearch, IconPhoto, IconMessageCircle, IconTrash, IconArrowsLeftRight } from '@tabler/icons-react';
import { Prism } from '@mantine/prism';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import okaidia from 'react-syntax-highlighter/dist/esm/styles/prism/okaidia';
import messageUtil from '../util/MessageUtil';


const blink = keyframes({
    '50%': { opacity: 0 },
});

const useStyles = createStyles((theme, _params, classNames) => ({
    panel: {
        height: '100%',
        backgroundColor: theme.colors.gray[0],
    },
    plusMenu: {
        top: 'unset !important',
        left: '31px !important',
        bottom: 60,
    },
    commandMenu: {
        top: 'unset !important',
        left: '31px !important',
        bottom: 60,
    },
    commandText: {
        fontSize: '1.0rem',
        fontWeight: 'bolder',
    },
    commandDesc: {
        fontSize: '0.8rem',
        color: theme.colors.gray[6],
    },
    responseContent: {
        marginTop: 0,
        marginLeft: 0,
        marginRight: 0,
        paddingLeft: 0,
        paddingRight: 0,
        width: 'calc(100% - 62px)',
    },
    icon: {
        pointerEvents: 'all',
    },
    avatar: {
        marginTop: 8,
        marginLeft: 8,
    },
    messageBody: {
    },
    cursor: {
        animation: `${blink} 0.5s infinite;`
    }
}));

const chatPanel = () => {

    const inputRef = useRef(null);
    const [messages, handlers] = useListState<{ type: string; message: string; }>([]);
    const [currentMessage, setCurrentMessage] = useState('');
    const [showCursor, setShowCursor] = useState(false);
    const [registed, setRegisted] = useState(false);
    const [opened, setOpened] = useState(false);
    const [input, setInput] = useState('');
    const [commandOpened, setCommandOpened] = useState(false);
    const { classes } = useStyles();
    const { height, width } = useViewportSize();

    const handlePlusClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setOpened(!opened);
        event.stopPropagation();
    };
    const handleContainerClick = (event: React.MouseEvent<HTMLDivElement>) => {
        if (opened) { setOpened(false); }
    };
    const handleSendClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        if (input) {
            // Add the user's message to the chat UI
            handlers.append({ type: 'user', message: input });

            // Clear the input field
            setInput('');
            setShowCursor(true);

            // Process and send the message to the extension
            messageUtil.sendMessage({
                command: 'sendMessage',
                text: input
            });
        }
    };

    useEffect(() => {
        // @ts-ignore
        inputRef?.current?.focus();
    }, []);


    // Add the received message to the chat UI as a bot message
    useEffect(() => {
        const lastIndex = messages?.length - 1;
        const lastMessage = messages[lastIndex];
        if (currentMessage) {
            if (lastMessage?.type === 'bot') {
                handlers.setItem(lastIndex, { type: 'bot', message: currentMessage });
            }
            else {
                handlers.append({ type: 'bot', message: currentMessage });
            }
        }
    }, [currentMessage]);

    // Add the received message to the chat UI as a bot message
    useEffect(() => {
        if (registed) return;
        setRegisted(true);
        messageUtil.registerHandler('receiveMessagePartial', (message: { text: string; }) => {
            setCurrentMessage(message.text);
        });
        messageUtil.registerHandler('receiveMessage', (message: { text: string; }) => {
            setCurrentMessage('');
        });
    }, [registed]);

    const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = event.target.value;
        // if value start with '/' command show menu
        if (value === '/') {
            setCommandOpened(true);
        } else {
            setCommandOpened(false);
        }
        setInput(value);
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key === 'Enter' && event.ctrlKey) {
            handleSendClick(event as any);
        }
    };

    const defaultMessages = (<Center>
        <Text size="lg" color="gray" weight={500}>No messages yet</Text>
    </Center>);

    const messageList = messages.map(({ message: messageText, type: messageType }, index) => {
        // setMessage(messageText);
        return (<>
            <Flex
                key={`message-${index}`}
                mih={50}
                gap="md"
                justify="flex-start"
                align="flex-start"
                direction="row"
                wrap="wrap"
                className={classes.messageBody}
            >
                {
                    messageType === 'bot'
                        ? <Avatar color="indigo" size='md' radius="xl" className={classes.avatar}><IconRobot size="1.5rem" /></Avatar>
                        : <Avatar color="cyan" size='md' radius="xl" className={classes.avatar}><IconUser size="1.5rem" /></Avatar>
                }

                <Container className={classes.responseContent}>
                    <ReactMarkdown
                        components={{
                            code({ node, inline, className, children, ...props }) {

                                const match = /language-(\w+)/.exec(className || '');
                                const value = String(children).replace(/\n$/, '');
                                const [copied, setCopied] = useState(false);
                                const handleCopy = () => {
                                    setCopied(true);
                                    setTimeout(() => setCopied(false), 2000);
                                };

                                return !inline && match ? (
                                    <div style={{ position: 'relative' }}>
                                        <div style={{ position: 'absolute', top: 0, left: 0 }}>
                                            {match[1] && (
                                                <div
                                                    style={{
                                                        backgroundColor: '#333',
                                                        color: '#fff',
                                                        padding: '0.2rem 0.5rem',
                                                        borderRadius: '0.2rem',
                                                        fontSize: '0.8rem',
                                                    }}
                                                >
                                                    {match[1]}
                                                </div>
                                            )}
                                        </div>
                                        <div style={{ position: 'absolute', top: 3, right: 5 }}>
                                            <CopyButton value={value} timeout={2000}>
                                                {({ copied, copy }) => (
                                                    <Tooltip label={copied ? 'Copied' : 'Copy'} withArrow position="right">
                                                        <ActionIcon color={copied ? 'teal' : 'gray'} onClick={copy}>
                                                            {copied ? <IconCheck size="1rem" /> : <IconCopy size="1rem" />}
                                                        </ActionIcon>
                                                    </Tooltip>
                                                )}
                                            </CopyButton>
                                        </div>
                                        <SyntaxHighlighter {...props} language={match[1]} customStyle={{ padding: '2em 1em 1em 2em' }} style={okaidia} PreTag="div">
                                            {value}
                                        </SyntaxHighlighter>
                                    </div>
                                ) : (
                                    <code {...props} className={className}>
                                        {children}
                                    </code>
                                );
                            }
                        }}
                    >
                        {messageText}
                    </ReactMarkdown>
                    {/* {markdown}{showCursor && <span className={classes.cursor}>|</span>} */}
                </Container>
            </Flex>
            {index !== messages.length - 1 && <Divider my="sm" />}
        </>);
    });

    return (
        <Container className={classes.panel} onClick={handleContainerClick}>
            <ScrollArea h={height - 70} type="never">
                {messageList.length > 0 ? messageList : defaultMessages}
            </ScrollArea>
            <Menu id='plusMenu' shadow="md" width={300} opened={opened} onChange={setOpened} >
                <Menu.Dropdown className={classes.plusMenu}>
                    <Menu.Item icon={<IconClick size={14} />}>Select code or file & right click</Menu.Item>
                    <Menu.Item icon={<IconGitCompare size={14} />}>Add `git diff --cached`</Menu.Item>
                    <Menu.Item icon={<IconGitCompare size={14} />}>Add `git diff HEAD`</Menu.Item>
                    <Menu.Item icon={<IconFolder size={14} />}>Add folder structure</Menu.Item>
                    <Menu.Item icon={<IconMessageDots size={14} />}>Select previous chat</Menu.Item>
                </Menu.Dropdown>
            </Menu>
            <Menu id='commandMenu' shadow="md" width={500} opened={commandOpened} onChange={setCommandOpened} returnFocus={true}>
                <Menu.Dropdown className={classes.commandMenu}>
                    <Menu.Label>Context Commands</Menu.Label>
                    <Menu.Item onClick={() => { setInput('/ref ') }}>
                        <Text className={classes.commandText}>
                            /ref
                        </Text>
                        <Text className={classes.commandDesc}>
                            Run a local CLI and add its output to the context (e.g., pytest .).
                        </Text>
                    </Menu.Item>
                    <Menu.Item onClick={() => { setInput('/local ') }}>
                        <Text className={classes.commandText}>
                            /local
                        </Text>
                        <Text className={classes.commandDesc}>
                            Bypass AI and run a local CLI to check its output (e.g., git status).
                        </Text>
                    </Menu.Item>

                    <Menu.Divider />

                    <Menu.Label>DevChat Bots</Menu.Label>

                    <Menu.Item onClick={() => { setInput('/code ') }}>
                        <Text className={classes.commandText}>
                            /code
                        </Text>
                        <Text className={classes.commandDesc}>
                            Generate or update code.
                        </Text>
                    </Menu.Item>
                    <Menu.Item onClick={() => { setInput('/commit_message ') }}>
                        <Text className={classes.commandText}>
                            /commit_message
                        </Text>
                        <Text className={classes.commandDesc}>
                            Write a commit message.
                        </Text>
                    </Menu.Item>
                    <Menu.Item onClick={() => { setInput('/doc ') }}>
                        <Text className={classes.commandText}>
                            /doc
                        </Text>
                        <Text className={classes.commandDesc}>
                            Write a doc for reference, wiki, or discussion.
                        </Text>
                    </Menu.Item>
                </Menu.Dropdown>
            </Menu>
            <Textarea
                value={input}
                ref={inputRef}
                onKeyDown={handleKeyDown}
                onChange={handleInputChange}
                autosize
                minRows={1}
                maxRows={10}
                radius="md"
                size="md"
                sx={{ pointerEvents: 'all' }}
                placeholder="Ctrl + Enter Send a message."
                styles={{ icon: { alignItems: 'flex-start', paddingTop: '9px' }, rightSection: { alignItems: 'flex-start', paddingTop: '9px' } }}
                icon={
                    <ActionIcon onClick={handlePlusClick} sx={{ pointerEvents: 'all' }}>
                        <IconSquareRoundedPlus size="1rem" />
                    </ActionIcon>
                }
                rightSection={
                    <ActionIcon onClick={handleSendClick}>
                        <IconSend size="1rem" />
                    </ActionIcon>
                }
            />
        </Container>
    );
};

export default chatPanel;