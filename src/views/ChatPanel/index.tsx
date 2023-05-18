import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { Accordion, AccordionControlProps, Avatar, Box, Center, Code, Container, CopyButton, Divider, Flex, Grid, Stack, Textarea, TypographyStylesProvider, px, rem, useMantineTheme } from '@mantine/core';
import { Input, Tooltip } from '@mantine/core';
import { List } from '@mantine/core';
import { ScrollArea } from '@mantine/core';
import { createStyles, keyframes } from '@mantine/core';
import { ActionIcon } from '@mantine/core';
import { Menu, Button, Text } from '@mantine/core';
import { useElementSize, useInterval, useListState, useResizeObserver, useTimeout, useViewportSize, useWindowScroll } from '@mantine/hooks';
import { IconAdjustments, IconBulb, IconCameraSelfie, IconCheck, IconClick, IconColumnInsertRight, IconCopy, IconDots, IconEdit, IconFileDiff, IconFolder, IconGitCommit, IconGitCompare, IconMessageDots, IconMessagePlus, IconPlayerStop, IconPrinter, IconPrompt, IconReplace, IconRobot, IconSend, IconSquareRoundedPlus, IconTerminal2, IconUser, IconX } from '@tabler/icons-react';
import { IconSettings, IconSearch, IconPhoto, IconMessageCircle, IconTrash, IconArrowsLeftRight } from '@tabler/icons-react';
import { Prism } from '@mantine/prism';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import okaidia from 'react-syntax-highlighter/dist/esm/styles/prism/okaidia';
import messageUtil from '../../util/MessageUtil';


const blink = keyframes({
    '50%': { opacity: 0 },
});

const useStyles = createStyles((theme, _params, classNames) => ({
    menu: {

    },
    avatar: {
        marginTop: 8,
        marginLeft: 8,
    },
}));

const chatPanel = () => {

    const theme = useMantineTheme();
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const scrollViewport = useRef<HTMLDivElement>(null);
    const [messages, messageHandlers] = useListState<{ type: string; message: string; contexts?: any[] }>([]);
    const [commandMenus, commandMenusHandlers] = useListState<{ pattern: string; description: string; name: string }>([]);
    const [contextMenus, contextMenusHandlers] = useListState<{ pattern: string; description: string; name: string }>([]);
    const [contexts, contextsHandlers] = useListState<any>([]);
    const [currentMessage, setCurrentMessage] = useState('');
    const [generating, setGenerating] = useState(false);
    const [responsed, setResponsed] = useState(false);
    const [registed, setRegisted] = useState(false);
    const [input, setInput] = useState('');
    const [menuOpend, setMenuOpend] = useState(false);
    const [menuType, setMenuType] = useState(''); // contexts or commands
    const { classes } = useStyles();
    const { height, width } = useViewportSize();
    const [inputRef, inputRect] = useResizeObserver();
    const [scrollPosition, onScrollPositionChange] = useState({ x: 0, y: 0 });
    const [stopScrolling, setStopScrolling] = useState(false);
    const messageCount = 10;

    const handlePlusClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setMenuType('contexts');
        setMenuOpend(!menuOpend);
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
        messageUtil.registerHandler('receiveMessage', (message: { text: string; }) => {
            setCurrentMessage(message.text);
            setGenerating(false);
            setResponsed(true);
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

    const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = event.target.value;
        // if value start with '/' command show menu
        if (value === '/') {
            setMenuOpend(true);
            setMenuType('commands');
        } else {
            setMenuOpend(false);
        }
        setInput(value);
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            handleSendClick(event as any);
        }
    };

    const defaultMessages = (<Center>
        <Text size="lg" color="gray" weight={500}>No messages yet</Text>
    </Center>);

    const commandMenusNode = commandMenus.map(({ pattern, description, name }, index) => {
        return (
            <Menu.Item
                sx={{
                    '&:hover, &[data-hovered]': {
                        color: 'var(--vscode-menu-selectionForeground)',
                        border: 'var(--vscode-menu-selectionBorder)',
                        backgroundColor: 'var(--vscode-menu-selectionBackground)'
                    }
                }}
                onClick={() => { setInput(`/${pattern} `); }}
                icon={<IconTerminal2 size={16} color='var(--vscode-menu-foreground)' />}
            >
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
            </Menu.Item>);
    });

    const contextMenusNode = contextMenus.map(({ pattern, description, name }, index) => {
        return (
            <Menu.Item
                sx={{
                    '&:hover, &[data-hovered]': {
                        color: 'var(--vscode-menu-selectionForeground)',
                        border: 'var(--vscode-menu-selectionBorder)',
                        backgroundColor: 'var(--vscode-menu-selectionBackground)'
                    }
                }}
                onClick={() => {
                    handleContextClick(name);
                }}
                icon={<IconMessagePlus size={16} color='var(--vscode-menu-foreground)' />}
            >
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
            </Menu.Item>);
    });

    const messageList = messages.map(({ message: messageText, type: messageType, contexts }, index) => {
        // setMessage(messageText);
        return (<>
            <Flex
                key={`message-${index}`}
                mih={50}
                w={scrollViewport.current?.clientWidth}
                gap="md"
                justify="flex-start"
                align="flex-start"
                direction="row"
                wrap="wrap"
            >
                {
                    messageType === 'bot'
                        ? <Avatar color="indigo" size='md' radius="xl" className={classes.avatar}><IconRobot size="1.5rem" /></Avatar>
                        : <Avatar color="cyan" size='md' radius="xl" className={classes.avatar}><IconUser size="1.5rem" /></Avatar>
                }

                <Container sx={{
                    marginTop: 0,
                    marginLeft: 0,
                    marginRight: 0,
                    paddingLeft: 0,
                    paddingRight: 0,
                    width: 'calc(100% - 62px)',
                    pre: {
                        whiteSpace: 'break-spaces'
                    },
                }}>
                    {contexts &&
                        <Accordion variant="contained" chevronPosition="left"
                            sx={{
                                backgroundColor: 'var(--vscode-menu-background)',
                            }}
                            styles={{
                                item: {
                                    border: 'var(--vscode-menu-border)',
                                    backgroundColor: 'var(--vscode-menu-background)',
                                },
                                control: {
                                    backgroundColor: 'var(--vscode-menu-background)',
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
                                    backgroundColor: 'var(--vscode-menu-background)',
                                }
                            }}
                        >
                            {
                                contexts?.map(({ context }, index) => {
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
                    }
                    <ReactMarkdown
                        components={{
                            code({ node, inline, className, children, ...props }) {

                                const match = /language-(\w+)/.exec(className || '');
                                const value = String(children).replace(/\n$/, '');
                                const [commited, setCommited] = useState(false);

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
                                        <Flex
                                            gap="5px"
                                            justify="flex-start"
                                            align="flex-start"
                                            direction="row"
                                            wrap="wrap"
                                            style={{ position: 'absolute', top: 8, right: 10 }}>
                                            <CopyButton value={value} timeout={2000}>
                                                {({ copied, copy }) => (
                                                    <Tooltip label={copied ? 'Copied' : 'Copy'} withArrow position="left" color="gray">
                                                        <ActionIcon color={copied ? 'teal' : 'gray'} onClick={copy}>
                                                            {copied ? <IconCheck size="1rem" /> : <IconCopy size="1rem" />}
                                                        </ActionIcon>
                                                    </Tooltip>
                                                )}
                                            </CopyButton>
                                            {match[1] && match[1] === 'commitmsg'
                                                ? (<>
                                                    <Tooltip label={commited ? 'Committing' : 'Commit'} withArrow position="left" color="gray">
                                                        <ActionIcon
                                                            color={commited ? 'teal' : 'gray'}
                                                            onClick={() => {
                                                                messageUtil.sendMessage({
                                                                    command: 'doCommit',
                                                                    content: value
                                                                });
                                                                setCommited(true);
                                                                setTimeout(() => { setCommited(false); }, 2000);
                                                            }}>
                                                            {commited ? <IconCheck size="1rem" /> : <IconGitCommit size="1rem" />}
                                                        </ActionIcon>
                                                    </Tooltip>
                                                </>)
                                                : (<>
                                                    <Tooltip label='View Diff' withArrow position="left" color="gray">
                                                        <ActionIcon onClick={() => {
                                                            messageUtil.sendMessage({
                                                                command: 'show_diff',
                                                                content: value
                                                            });
                                                        }}>
                                                            <IconFileDiff size="1.125rem" />
                                                        </ActionIcon>
                                                    </Tooltip>
                                                    <Tooltip label='Insert Code' withArrow position="left" color="gray">
                                                        <ActionIcon onClick={() => {
                                                            messageUtil.sendMessage({
                                                                command: 'code_apply',
                                                                content: value
                                                            });
                                                        }}>
                                                            <IconColumnInsertRight size="1.125rem" />
                                                        </ActionIcon>
                                                    </Tooltip>
                                                    <Tooltip label='Replace' withArrow position="left" color="gray">
                                                        <ActionIcon onClick={() => {
                                                            messageUtil.sendMessage({
                                                                command: 'code_file_apply',
                                                                content: value
                                                            });
                                                        }}>
                                                            <IconReplace size="1.125rem" />
                                                        </ActionIcon>
                                                    </Tooltip>
                                                </>)}
                                        </Flex>
                                        <SyntaxHighlighter {...props} language={match[1]} customStyle={{ padding: '2em 1em 1em 2em', }} style={okaidia} PreTag="div">
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
                    {(generating && messageType === 'bot' && index === messages.length - 1) ? <Text sx={{
                        animation: `${blink} 0.5s infinite;`,
                        width: 5,
                        marginTop: responsed ? 0 : '1em',
                        backgroundColor: 'black',
                        display: 'block'

                    }}>|</Text> : ''}
                </Container >
            </Flex >
            {index !== messages.length - 1 && <Divider my="sm" />
            }
        </>);
    });

    return (
        <Container
            id='chat-container'
            ref={chatContainerRef}
            sx={{
                height: '100%',
                paddingTop: 10,
                background: 'var(--vscode-editor-background)',
                color: 'var(--vscode-editor-foreground)'
            }}>
            <ScrollArea
                id='chat-scroll-area'
                h={generating ? height - px('8rem') : height - px('5rem')}
                w={width - px('2rem')}
                type="never"
                onScrollPositionChange={onScrollPositionChange}
                viewportRef={scrollViewport}>
                {messageList.length > 0 ? messageList : defaultMessages}
            </ScrollArea>
            <Stack
                sx={{ position: 'absolute', bottom: 10, width: scrollViewport.current?.clientWidth }}>
                {generating &&
                    <Center>
                        <Button
                            leftIcon={<IconPlayerStop color='var(--vscode-button-foreground)' />}
                            sx={{
                                backgroundColor: 'var(--vscode-button-background)',
                            }}
                            styles={{
                                icon: {
                                    color: 'var(--vscode-button-foreground)'
                                },
                                label: {
                                    color: 'var(--vscode-button-foreground)'
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
                        </Button>
                    </Center>
                }
                {contexts && contexts.length > 0 &&
                    <Accordion variant="contained" chevronPosition="left"
                        sx={{
                            backgroundColor: 'var(--vscode-menu-background)',
                        }}
                        styles={{
                            item: {
                                border: 'var(--vscode-menu-border)',
                                backgroundColor: 'var(--vscode-menu-background)',
                            },
                            control: {
                                backgroundColor: 'var(--vscode-menu-background)',
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
                                backgroundColor: 'var(--vscode-menu-background)',
                            }
                        }}
                    >
                        {
                            contexts.map(({ context }, index) => {
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
                                                size="lg"
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
                    </Accordion>
                }
                <Menu
                    id='commandMenu'
                    position='top-start'
                    closeOnClickOutside={true}
                    shadow="xs"
                    width={scrollViewport.current?.clientWidth}
                    opened={menuOpend}
                    onChange={() => {
                        setMenuOpend(!menuOpend);
                        inputRef.current.focus();
                    }}
                    onClose={() => setMenuType('')}
                    onOpen={() => menuType !== '' ? setMenuOpend(true) : setMenuOpend(false)}
                    returnFocus={true}
                >
                    <Menu.Target>
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
                            size="md"
                            sx={{ pointerEvents: 'all' }}
                            placeholder="Send a message."
                            styles={{
                                icon: { alignItems: 'flex-start', paddingTop: '9px' },
                                rightSection: { alignItems: 'flex-start', paddingTop: '9px' },
                                input: {
                                    backgroundColor: 'var(--vscode-input-background)',
                                    border: 'var(--vscode-input-border)',
                                    color: 'var(--vscode-input-foreground)',
                                    '&[data-disabled]': {
                                        color: 'var(--vscode-disabledForeground)'
                                    }
                                }
                            }}
                            icon={
                                <ActionIcon
                                    disabled={generating}
                                    onClick={handlePlusClick}
                                    sx={{
                                        pointerEvents: 'all',
                                        '&:hover': {
                                            backgroundColor: 'var(--vscode-toolbar-activeBackground)'
                                        },
                                        '&[data-disabled]': {
                                            border: 'var(--vscode-input-border)',
                                            backgroundColor: 'var(--vscode-toolbar-activeBackground)'
                                        }
                                    }}
                                >
                                    <IconSquareRoundedPlus size="1rem" />
                                </ActionIcon>
                            }
                            rightSection={
                                <ActionIcon
                                    disabled={generating}
                                    onClick={handleSendClick}
                                    sx={{
                                        pointerEvents: 'all',
                                        '&:hover': {
                                            backgroundColor: 'var(--vscode-toolbar-activeBackground)'
                                        },
                                        '&[data-disabled]': {
                                            border: 'var(--vscode-input-border)',
                                            backgroundColor: 'var(--vscode-toolbar-activeBackground)'
                                        }
                                    }}
                                >
                                    <IconSend size="1rem" />
                                </ActionIcon>
                            }
                        />
                    </Menu.Target>
                    {
                        menuType === 'contexts'
                            ? (<Menu.Dropdown
                                sx={{
                                    color: 'var(--vscode-menu-foreground)',
                                    border: 'var(--vscode-menu-border)',
                                    backgroundColor: 'var(--vscode-menu-background)'
                                }}>
                                <Text
                                    c="dimmed"
                                    ta="left"
                                    fz='sm'
                                    m='12px'>
                                    <IconBulb size={14} style={{ marginTop: '2px', marginRight: '2px' }} />
                                    Tips: Select code or file & right click
                                </Text>
                                <Divider />
                                <Menu.Label>DevChat Contexts</Menu.Label>
                                {contextMenusNode}
                            </Menu.Dropdown>)
                            : menuType === 'commands'
                                ? <Menu.Dropdown
                                    sx={{
                                        color: 'var(--vscode-menu-foreground)',
                                        border: 'var(--vscode-menu-border)',
                                        backgroundColor: 'var(--vscode-menu-background)'
                                    }}>
                                    <Menu.Label>DevChat Commands</Menu.Label>
                                    {commandMenusNode}
                                </Menu.Dropdown>
                                : <></>
                    }
                </Menu>
            </Stack>
        </Container >
    );
};

export default chatPanel;