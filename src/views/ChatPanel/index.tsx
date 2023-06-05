import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { Image, Accordion, Avatar, Box, Center, Container, CopyButton, Divider, Flex, Popover, Stack, Textarea, px, useMantineTheme } from '@mantine/core';
import { Tooltip } from '@mantine/core';
import { ScrollArea } from '@mantine/core';
import { createStyles, keyframes } from '@mantine/core';
import { ActionIcon } from '@mantine/core';
import { Button, Text } from '@mantine/core';
import { useListState, useResizeObserver, useTimeout, useViewportSize } from '@mantine/hooks';
import { IconBulb, IconCheck, IconColumnInsertRight, IconCopy, IconFileDiff, IconGitCommit, IconMessagePlus, IconPlayerPlay, IconPlayerStop, IconReplace, IconRotateDot, IconSend, IconSquareRoundedPlus, IconTerminal2, IconUserCircle, IconX } from '@tabler/icons-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import okaidia from 'react-syntax-highlighter/dist/esm/styles/prism/okaidia';
import messageUtil from '../../util/MessageUtil';
// @ts-ignore
import SvgAvatarDevChat from './avatar_devchat.svg';
// @ts-ignore
import SvgAvatarUser from './avatar_spaceman.png';

import { IconMouseRightClick, IconBook, IconGitBranch, IconGitBranchChecked, IconShellCommand } from './Icons';

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

const MessageContainer = (props: any) => {
    const { generating, messages, chatContainerRect, responsed } = props;

    const DefaultMessage = (<Center>
        <Text size="lg" color="gray" weight={500}>No messages yet</Text>
    </Center>);

    const MessageAvatar = (props: any) => {
        const { type } = props;
        return (<Flex
            m='10px 0 10px 0'
            gap="sm"
            justify="flex-start"
            align="center"
            direction="row"
            wrap="wrap">
            {
                type === 'bot'
                    ? <Avatar
                        color="indigo"
                        size={25}
                        radius="xl"
                        src={SvgAvatarDevChat} />
                    : <Avatar
                        color="cyan"
                        size={25}
                        radius="xl"
                        src={SvgAvatarUser} />
            }
            <Text weight='bold'>{type === 'bot' ? 'DevChat' : 'User'}</Text>
        </Flex>);
    };

    const MessageContext = (props: any) => {
        const { contexts } = props;
        return (contexts &&
            <Accordion variant="contained" chevronPosition="left"
                sx={{
                    marginTop: 5,
                    borderRadius: 5,
                    backgroundColor: 'var(--vscode-menu-background)',
                }}
                styles={{
                    item: {
                        borderColor: 'var(--vscode-menu-border)',
                        backgroundColor: 'var(--vscode-menu-background)',
                        '&[data-active]': {
                            backgroundColor: 'var(--vscode-menu-background)',
                        }
                    },
                    control: {
                        height: 30,
                        borderRadius: 3,
                        backgroundColor: 'var(--vscode-menu-background)',
                        '&[aria-expanded="true"]': {
                            borderBottomLeftRadius: 0,
                            borderBottomRightRadius: 0,
                        },
                        '&:hover': {
                            backgroundColor: 'var(--vscode-menu-background)',
                        }
                    },
                    chevron: {
                        color: 'var(--vscode-menu-foreground)',
                    },
                    icon: {
                        color: 'var(--vscode-menu-foreground)',
                    },
                    label: {
                        color: 'var(--vscode-menu-foreground)',
                    },
                    panel: {
                        color: 'var(--vscode-menu-foreground)',
                        backgroundColor: 'var(--vscode-menu-background)',
                    },
                    content: {
                        borderRadius: 3,
                        backgroundColor: 'var(--vscode-menu-background)',
                    }
                }}
            >
                {
                    contexts?.map((item: any, index: number) => {
                        const { context } = item;
                        return (
                            <Accordion.Item value={`item-${index}`} mah='200'>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <Accordion.Control >
                                        {'command' in context ? context.command : context.path}
                                    </Accordion.Control>
                                </Box>
                                <Accordion.Panel>
                                    {
                                        context.content
                                            ? context.content
                                            : <Center>
                                                <Text c='gray.3'>No content</Text>
                                            </Center>
                                    }

                                </Accordion.Panel>
                            </Accordion.Item>
                        );
                    })
                }
            </Accordion>
        );
    };

    const MessageBlink = (props: any) => {
        const { generating, messageType, lastMessage } = props;
        const blink = keyframes({
            '50%': { opacity: 0 },
        });

        return (generating && messageType === 'bot' && lastMessage
            ? <Text sx={{
                animation: `${blink} 0.5s infinite;`,
                width: 5,
                marginTop: responsed ? 0 : '1em',
                backgroundColor: 'black',
                display: 'block'

            }}>|</Text>
            : <></>);
    };

    const messageList = messages.map((item: any, index: number) => {
        const { message: messageText, type: messageType, contexts } = item;
        // setMessage(messageText);
        return (<>
            <Stack
                spacing={0}
                key={`message-${index}`}
                sx={{
                    width: chatContainerRect.width,
                    padding: 0,
                    margin: 0,
                }}>
                <MessageAvatar type={messageType} />
                <Container sx={{
                    margin: 0,
                    padding: 0,
                    width: chatContainerRect.width,
                    pre: {
                        whiteSpace: 'break-spaces'
                    },
                }}>
                    <MessageContext contexts={contexts} />
                    <CodeBlock messageText={messageText} />
                    <MessageBlink generating={generating} messageType={messageType} lastMessage={index === messages.length - 1} />
                </Container >
            </Stack >
            {index !== messages.length - 1 && <Divider my={3} />}
        </>);
    });

    return (messageList.length > 0 ? messageList : DefaultMessage);
};

const chatPanel = () => {

    const theme = useMantineTheme();
    const [chatContainerRef, chatContainerRect] = useResizeObserver();
    const scrollViewport = useRef<HTMLDivElement>(null);
    const [messages, messageHandlers] = useListState<{ type: string; message: string; contexts?: any[] }>([]);
    const [commandMenus, commandMenusHandlers] = useListState<{ pattern: string; description: string; name: string }>([]);
    const [contextMenus, contextMenusHandlers] = useListState<{ pattern: string; description: string; name: string }>([]);
    const [commandMenusNode, setCommandMenusNode] = useState<any>(null);
    const [currentMenuIndex, setCurrentMenuIndex] = useState<number>(0);
    const [contexts, contextsHandlers] = useListState<any>([]);
    const [currentMessage, setCurrentMessage] = useState('');
    const [generating, setGenerating] = useState(false);
    const [responsed, setResponsed] = useState(false);
    const [registed, setRegisted] = useState(false);
    const [input, setInput] = useState('');
    const [menuOpend, setMenuOpend] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [menuType, setMenuType] = useState(''); // contexts or commands
    const { height, width } = useViewportSize();
    const [inputRef, inputRect] = useResizeObserver();
    const [scrollPosition, onScrollPositionChange] = useState({ x: 0, y: 0 });
    const [stopScrolling, setStopScrolling] = useState(false);
    const messageCount = 10;

    const handlePlusClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setMenuType('contexts');
        setMenuOpend(!menuOpend);
        inputRef.current.focus();
        event.stopPropagation();
    };

    const handleSendClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        if (input) {
            // Add the user's message to the chat UI
            messageHandlers.append({ type: 'user', message: input, contexts: contexts ? [...contexts].map((item) => ({ ...item })) : undefined });

            // Process and send the message to the extension
            const contextStrs = contexts.map(({ file, context }, index) => {
                return `[context|${file}]`;
            });
            const text = input + contextStrs.join(' ');
            // console.log(`message text: ${text}`);
            messageUtil.sendMessage({
                command: 'sendMessage',
                text: text
            });

            // Clear the input field
            setInput('');
            contexts.length = 0;

            // start generating
            setGenerating(true);
            setResponsed(false);
            setCurrentMessage('');
        }
    };

    const handleContextClick = (contextName: string) => {
        // Process and send the message to the extension
        messageUtil.sendMessage({
            command: 'addContext',
            selected: contextName
        });
    };

    const scrollToBottom = () =>
        scrollViewport?.current?.scrollTo({ top: scrollViewport.current.scrollHeight, behavior: 'smooth' });

    const timer = useTimeout(() => {
        // console.log(`stopScrolling:${stopScrolling}`);
        if (!stopScrolling) {
            scrollToBottom();
        }
    }, 1000);

    useEffect(() => {
        inputRef.current.focus();
        messageUtil.sendMessage({ command: 'regContextList' });
        messageUtil.sendMessage({ command: 'regCommandList' });
        messageUtil.sendMessage({ command: 'historyMessages' });
        timer.start();
        return () => {
            timer.clear();
        };
    }, []);

    useEffect(() => {
        const sh = scrollViewport.current?.scrollHeight || 0;
        const vh = scrollViewport.current?.clientHeight || 0;
        const isBottom = sh < vh ? true : sh - vh - scrollPosition.y < 3;
        if (isBottom) {
            setStopScrolling(false);
        } else {
            setStopScrolling(true);
        }
    }, [scrollPosition]);

    useEffect(() => {
        if (generating) {
            // new a bot message
            messageHandlers.append({ type: 'bot', message: currentMessage });
        }
    }, [generating]);

    // Add the received message to the chat UI as a bot message
    useEffect(() => {
        const lastIndex = messages?.length - 1;
        const lastMessage = messages[lastIndex];
        if (currentMessage && lastMessage?.type === 'bot') {
            // update the last one bot message
            messageHandlers.setItem(lastIndex, { type: 'bot', message: currentMessage });
        }
        timer.start();
    }, [currentMessage]);

    useEffect(() => {
        if (messages.length > messageCount * 2) {
            messageHandlers.remove(0, 1);
        }
        timer.start();
    }, [messages]);

    // Add the received message to the chat UI as a bot message
    useEffect(() => {
        if (registed) return;
        setRegisted(true);
        messageUtil.registerHandler('receiveMessagePartial', (message: { text: string; }) => {
            setCurrentMessage(message.text);
            setResponsed(true);
        });
        messageUtil.registerHandler('receiveMessage', (message: { text: string; isError: boolean }) => {
            setCurrentMessage(message.text);
            setGenerating(false);
            setResponsed(true);
            if (message.isError) {
                setHasError(true);
            }
        });
        messageUtil.registerHandler('regCommandList', (message: { result: { pattern: string; description: string; name: string }[] }) => {
            commandMenusHandlers.append(...message.result);
        });
        messageUtil.registerHandler('regContextList', (message: { result: { pattern: string; description: string; name: string }[] }) => {
            contextMenusHandlers.append(...message.result);
        });
        messageUtil.registerHandler('appendContext', (message: { command: string; context: string }) => {
            // context is a temp file path
            const match = /\|([^]+?)\]/.exec(message.context);
            // Process and send the message to the extension
            messageUtil.sendMessage({
                command: 'contextDetail',
                file: match && match[1],
            });
        });
        messageUtil.registerHandler('contextDetailResponse', (message: { command: string; file: string; result: string }) => {
            //result is a content json 
            // 1. diff json structure
            // {
            // 	languageId: languageId,
            // 	path: fileSelected,
            // 	content: codeSelected
            // };
            // 2. command json structure
            // {
            //     command: commandString,
            //     content: stdout
            // };
            const context = JSON.parse(message.result);
            if (typeof context !== 'undefined' && context) {
                contextsHandlers.append({
                    file: message.file,
                    context: context,
                });
            }
        });
        messageUtil.registerHandler('loadHistoryMessages', (message: { command: string; entries: [{ hash: '', user: '', date: '', request: '', response: '', context: [{ content: '', role: '' }] }] }) => {
            message.entries?.forEach(({ hash, user, date, request, response, context }, index) => {
                if (index < message.entries.length - messageCount) return;
                const contexts = context.map(({ content, role }) => ({ context: JSON.parse(content) }));
                messageHandlers.append({ type: 'user', message: request, contexts: contexts });
                messageHandlers.append({ type: 'bot', message: response });
            });
        });
    }, [registed]);

    const commandMenuIcon = (pattern: string) => {
        if (pattern === 'commit_message') {
            return (<IconBook size={16}
                color='var(--vscode-menu-foreground)'
                style={{
                    marginTop: 8,
                    marginLeft: 12,
                }} />);
        }
        return (<IconShellCommand size={16}
            color='var(--vscode-menu-foreground)'
            style={{
                marginTop: 8,
                marginLeft: 12,
            }} />);
    };
    useEffect(() => {
        let filtered = commandMenus;
        if (input) {
            filtered = commandMenus.filter((item) => `/${item.pattern}`.startsWith(input));
        }
        const node = filtered.map(({ pattern, description, name }, index) => {
            return (
                <Flex
                    mih={40}
                    gap="md"
                    justify="flex-start"
                    align="flex-start"
                    direction="row"
                    wrap="wrap"
                    sx={{
                        padding: '5px 0',
                        '&:hover,&[aria-checked=true]': {
                            cursor: 'pointer',
                            color: 'var(--vscode-commandCenter-activeForeground)',
                            backgroundColor: 'var(--vscode-commandCenter-activeBackground)'
                        }
                    }}
                    onClick={() => {
                        setInput(`/${pattern} `);
                        setMenuOpend(false);
                    }}
                    aria-checked={index === currentMenuIndex}
                    data-pattern={pattern}
                >
                    {commandMenuIcon(pattern)}
                    <Stack spacing={0}>
                        <Text sx={{
                            fontSize: 'sm',
                            fontWeight: 'bolder',
                            color: 'var(--vscode-menu-foreground)'
                        }}>
                            /{pattern}
                        </Text>
                        <Text sx={{
                            fontSize: 'sm',
                            color: theme.colors.gray[6],
                        }}>
                            {description}
                        </Text>
                    </Stack>
                </Flex>);
        });
        setCommandMenusNode(node);
        if (node.length === 0) {
            setMenuOpend(false);
        }
    }, [input, commandMenus, currentMenuIndex]);

    const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = event.target.value;
        // if value start with '/' command show menu
        if (value.startsWith('/')) {
            setMenuOpend(true);
            setMenuType('commands');
            setCurrentMenuIndex(0);
        } else {
            setMenuOpend(false);
        }
        setInput(value);
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (menuOpend) {
            if (event.key === 'Escape') {
                setMenuOpend(false);
            }
            if (menuType === 'commands') {
                if (event.key === 'ArrowDown') {
                    const newIndex = currentMenuIndex + 1;
                    setCurrentMenuIndex(newIndex < commandMenusNode.length ? newIndex : 0);
                    event.preventDefault();
                }
                if (event.key === 'ArrowUp') {
                    const newIndex = currentMenuIndex - 1;
                    setCurrentMenuIndex(newIndex < 0 ? commandMenusNode.length - 1 : newIndex);
                    event.preventDefault();
                }
                if (event.key === 'Enter' && !event.shiftKey) {
                    const commandNode = commandMenusNode[currentMenuIndex];
                    setInput(`/${commandNode.props['data-pattern']} `);
                    setMenuOpend(false);
                    event.preventDefault();
                }
            }
        } else {
            if (event.key === 'Enter' && !event.shiftKey) {
                handleSendClick(event as any);
            }
        }
    };

    const contextMenuIcon = (name: string) => {
        if (name === 'git diff --cached') {
            return (<IconGitBranchChecked size={16}
                color='var(--vscode-menu-foreground)'
                style={{
                    marginTop: 8,
                    marginLeft: 12,
                }} />);
        }
        if (name === 'git diff HEAD') {
            return (<IconGitBranch size={16}
                color='var(--vscode-menu-foreground)'
                style={{
                    marginTop: 8,
                    marginLeft: 12,
                }} />);
        }
        if (name === '<custom command>') {
            return (<IconShellCommand size={16}
                color='var(--vscode-menu-foreground)'
                style={{
                    marginTop: 8,
                    marginLeft: 12,
                }} />);
        }
    };
    const contextMenusNode = contextMenus.map(({ pattern, description, name }, index) => {
        return (
            <Flex
                mih={40}
                gap="md"
                justify="flex-start"
                align="flex-start"
                direction="row"
                wrap="wrap"
                sx={{
                    padding: '5px 0',
                    '&:hover': {
                        cursor: 'pointer',
                        color: 'var(--vscode-commandCenter-activeForeground)',
                        backgroundColor: 'var(--vscode-commandCenter-activeBackground)'
                    }
                }}
                onClick={() => {
                    handleContextClick(name);
                    setMenuOpend(false);
                }}
            >
                {contextMenuIcon(name)}
                <Stack spacing={0}>
                    <Text sx={{
                        fontSize: 'sm',
                        fontWeight: 'bolder',
                        color: 'var(--vscode-menu-foreground)'
                    }}>
                        {name}
                    </Text>
                    <Text sx={{
                        fontSize: 'sm',
                        color: theme.colors.gray[6],
                    }}>
                        {description}
                    </Text>
                </Stack>
            </Flex>);
    });

    const RegenerationButton = () => {
        return (<Button
            size='xs'
            leftIcon={<IconRotateDot color='var(--vscode-button-foreground)' />}
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
            variant="white"
            onClick={() => {
                messageUtil.sendMessage({
                    command: 'regeneration'
                });
                messageHandlers.pop();
                setHasError(false);
                setGenerating(true);
                setResponsed(false);
                setCurrentMessage('');
            }}>
            Regeneration
        </Button>);
    };

    const StopButton = () => {
        return (
            <Button
                size='xs'
                leftIcon={<IconPlayerStop color='var(--vscode-button-foreground)' />}
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
                variant="white"
                onClick={() => {
                    messageUtil.sendMessage({
                        command: 'stopDevChat'
                    });
                    setGenerating(false);
                }}>
                Stop generating
            </Button>);
    };

    const InputContexts = (props: any) => {
        const { contexts } = props;
        return (<Accordion variant="contained" chevronPosition="left"
            sx={{
                backgroundColor: 'var(--vscode-menu-background)',
            }}
            styles={{
                item: {
                    borderColor: 'var(--vscode-menu-border)',
                    backgroundColor: 'var(--vscode-menu-background)',
                    '&[data-active]': {
                        backgroundColor: 'var(--vscode-menu-background)',
                    }
                },
                control: {
                    height: 30,
                    borderRadius: 3,
                    backgroundColor: 'var(--vscode-menu-background)',
                    '&[aria-expanded="true"]': {
                        borderBottomLeftRadius: 0,
                        borderBottomRightRadius: 0,
                    },
                    '&:hover': {
                        backgroundColor: 'var(--vscode-menu-background)',
                    }
                },
                chevron: {
                    color: 'var(--vscode-menu-foreground)',
                },
                icon: {
                    color: 'var(--vscode-menu-foreground)',
                },
                label: {
                    color: 'var(--vscode-menu-foreground)',
                },
                panel: {
                    color: 'var(--vscode-menu-foreground)',
                    backgroundColor: 'var(--vscode-menu-background)',
                    overflow: 'hidden',
                },
                content: {
                    borderRadius: 3,
                    backgroundColor: 'var(--vscode-menu-background)',
                }
            }}>
            {
                contexts.map((item: any, index: number) => {
                    const { context } = item;
                    return (
                        <Accordion.Item value={`item-${index}`} >
                            <Box sx={{
                                display: 'flex', alignItems: 'center',
                                backgroundColor: 'var(--vscode-menu-background)',
                            }}>
                                <Accordion.Control w={'calc(100% - 40px)'}>
                                    {'command' in context ? context.command : context.path}
                                </Accordion.Control>
                                <ActionIcon
                                    mr={8}
                                    size="sm"
                                    sx={{
                                        color: 'var(--vscode-menu-foreground)',
                                        '&:hover': {
                                            backgroundColor: 'var(--vscode-toolbar-activeBackground)'
                                        }
                                    }}
                                    onClick={() => {
                                        contextsHandlers.remove(index);
                                    }}>
                                    <IconX size="1rem" />
                                </ActionIcon>
                            </Box>
                            <Accordion.Panel mah={300}>
                                <ScrollArea h={300} type="never">
                                    {
                                        context.content
                                            ? <pre style={{ overflowWrap: 'normal' }}>{context.content}</pre>
                                            : <Center>
                                                <Text c='gray.3'>No content</Text>
                                            </Center>
                                    }
                                </ScrollArea>
                            </Accordion.Panel>
                        </Accordion.Item>
                    );
                })
            }
        </Accordion>);
    };

    const InputMessage = (props: any) => {
        const { } = props;
        return (<Popover
            id='commandMenu'
            position='top-start'
            closeOnClickOutside={true}
            shadow="sm"
            width={chatContainerRect.width}
            opened={menuOpend}
            onChange={() => {
                setMenuOpend(!menuOpend);
                inputRef.current.focus();
            }}
            onClose={() => setMenuType('')}
            onOpen={() => menuType !== '' ? setMenuOpend(true) : setMenuOpend(false)}
            returnFocus={true}>
            <Popover.Target>
                <Textarea
                    id='chat-textarea'
                    disabled={generating}
                    value={input}
                    ref={inputRef}
                    onKeyDown={handleKeyDown}
                    onChange={handleInputChange}
                    autosize
                    minRows={1}
                    maxRows={10}
                    radius="md"
                    size="xs"
                    sx={{ pointerEvents: 'all' }}
                    placeholder="Send a message."
                    styles={{
                        icon: { alignItems: 'center', paddingLeft: '5px' },
                        rightSection: { alignItems: 'center', paddingRight: '5px' },
                        input: {
                            fontSize: 'var(--vscode-editor-font-size)',
                            backgroundColor: 'var(--vscode-input-background)',
                            borderColor: 'var(--vscode-input-border)',
                            color: 'var(--vscode-input-foreground)',
                            '&[data-disabled]': {
                                color: 'var(--vscode-disabledForeground)'
                            }
                        }
                    }}
                    icon={
                        <ActionIcon
                            size='sm'
                            disabled={generating}
                            onClick={handlePlusClick}
                            sx={{
                                pointerEvents: 'all',
                                '&:hover': {
                                    backgroundColor: 'var(--vscode-toolbar-activeBackground)'
                                },
                                '&[data-disabled]': {
                                    borderColor: 'var(--vscode-input-border)',
                                    backgroundColor: 'var(--vscode-toolbar-activeBackground)'
                                }
                            }}
                        >
                            <IconSquareRoundedPlus size="1rem" />
                        </ActionIcon>
                    }
                    rightSection={
                        <ActionIcon
                            size='sm'
                            disabled={generating}
                            onClick={handleSendClick}
                            sx={{
                                pointerEvents: 'all',
                                '&:hover': {
                                    backgroundColor: 'var(--vscode-toolbar-activeBackground)'
                                },
                                '&[data-disabled]': {
                                    borderColor: 'var(--vscode-input-border)',
                                    backgroundColor: 'var(--vscode-toolbar-activeBackground)'
                                }
                            }}
                        >
                            <IconSend size="1rem" />
                        </ActionIcon>
                    }
                />
            </Popover.Target>
            {
                menuType === 'contexts'
                    ? (<Popover.Dropdown
                        sx={{
                            padding: 0,
                            color: 'var(--vscode-menu-foreground)',
                            borderColor: 'var(--vscode-menu-border)',
                            backgroundColor: 'var(--vscode-menu-background)'
                        }}>
                        <Flex
                            gap="3px"
                            justify="flex-start"
                            align="center"
                            direction="row"
                            wrap="wrap"
                            sx={{ overflow: 'hidden' }}
                        >
                            <IconMouseRightClick
                                size={14}
                                color={'var(--vscode-menu-foreground)'}
                                style={{ marginLeft: '12px' }} />
                            <Text
                                c="dimmed"
                                ta="left"
                                fz='sm'
                                m='12px 5px'
                                truncate='end'
                                w={chatContainerRect.width - 60}>
                                Tips: Select code or file & right click
                            </Text>
                        </Flex>
                        <Divider />
                        <Text sx={{ padding: '5px 5px 5px 10px' }}>DevChat Contexts</Text>
                        {contextMenusNode}
                    </Popover.Dropdown>)
                    : menuType === 'commands' && commandMenusNode.length > 0
                        ? <Popover.Dropdown
                            sx={{
                                padding: 0,
                                color: 'var(--vscode-menu-foreground)',
                                borderColor: 'var(--vscode-menu-border)',
                                backgroundColor: 'var(--vscode-menu-background)'
                            }}>
                            <Text sx={{ padding: '5px 5px 5px 10px' }}>DevChat Commands</Text>
                            {commandMenusNode}
                        </Popover.Dropdown>
                        : <></>
            }
        </Popover>);
    };

    return (
        <Container
            id='chat-container'
            ref={chatContainerRef}
            sx={{
                height: '100%',
                margin: 0,
                padding: 10,
                background: 'var(--vscode-sideBar-background)',
                color: 'var(--vscode-editor-foreground)',
                minWidth: 240
            }}>
            <ScrollArea
                id='chat-scroll-area'
                type="never"
                sx={{
                    height: generating ? height - px('8rem') : height - px('5rem'),
                    width: chatContainerRect.width,
                    padding: 0,
                    margin: 0,
                }}
                onScrollPositionChange={onScrollPositionChange}
                viewportRef={scrollViewport}>
                <MessageContainer generating={generating} messages={messages} chatContainerRect={chatContainerRect} responsed={responsed} />
            </ScrollArea>
            <Stack
                spacing={5}
                sx={{ position: 'absolute', bottom: 10, width: chatContainerRect.width }}>
                {generating &&
                    <Center>
                        <StopButton />
                    </Center>
                }
                {hasError &&
                    <Center>
                        <RegenerationButton />
                    </Center>
                }
                {contexts && contexts.length > 0 &&
                    <InputContexts contexts={contexts} />
                }
                <InputMessage />
            </Stack>
        </Container >
    );
};

export default chatPanel;