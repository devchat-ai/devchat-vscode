import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { Avatar, Center, Container, CopyButton, Divider, Flex, Grid, Stack, Textarea, TypographyStylesProvider, px, rem, useMantineTheme } from '@mantine/core';
import { Input, Tooltip } from '@mantine/core';
import { List } from '@mantine/core';
import { ScrollArea } from '@mantine/core';
import { createStyles, keyframes } from '@mantine/core';
import { ActionIcon } from '@mantine/core';
import { Menu, Button, Text } from '@mantine/core';
import { useElementSize, useListState, useResizeObserver, useViewportSize } from '@mantine/hooks';
import { IconBulb, IconCheck, IconClick, IconCopy, IconEdit, IconFolder, IconGitCompare, IconMessageDots, IconMessagePlus, IconPrompt, IconRobot, IconSend, IconSquareRoundedPlus, IconTerminal2, IconUser } from '@tabler/icons-react';
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
    const [messages, messageHandlers] = useListState<{ type: string; message: string; }>([]);
    const [commands, commandHandlers] = useListState<{ pattern: string; description: string; name: string }>([]);
    const [contexts, contextHandlers] = useListState<{ pattern: string; description: string; name: string }>([]);
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

    const handlePlusClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setMenuType('contexts');
        setMenuOpend(!menuOpend);
        event.stopPropagation();
    };

    const handleSendClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        if (input) {
            // Add the user's message to the chat UI
            messageHandlers.append({ type: 'user', message: input });

            // Clear the input field
            setInput('');

            // Process and send the message to the extension
            messageUtil.sendMessage({
                command: 'sendMessage',
                text: input
            });

            // start generating
            setGenerating(true);
            setResponsed(false);
            setCurrentMessage('');
        }
    };
    const scrollToBottom = () =>
        scrollViewport?.current?.scrollTo({ top: scrollViewport.current.scrollHeight, behavior: 'smooth' });

    useEffect(() => {
        inputRef.current.focus();
        messageUtil.sendMessage({ command: 'regContextList' });
        messageUtil.sendMessage({ command: 'regCommandList' });
    }, []);

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
    }, [currentMessage]);

    // Add the received message to the chat UI as a bot message
    useEffect(() => {
        if (registed) return;
        setRegisted(true);
        messageUtil.registerHandler('receiveMessagePartial', (message: { text: string; }) => {
            setCurrentMessage(message.text);
            setResponsed(true);
            scrollToBottom();
        });
        messageUtil.registerHandler('receiveMessage', (message: { text: string; }) => {
            setCurrentMessage(message.text);
            setGenerating(false);
            setResponsed(true);
            scrollToBottom();
        });
        messageUtil.registerHandler('regCommandList', (message: { result: { pattern: string; description: string; name: string }[] }) => {
            commandHandlers.append(...message.result);
            console.log(`commands:${commands}`);
        });
        messageUtil.registerHandler('regContextList', (message: { result: { pattern: string; description: string; name: string }[] }) => {
            contextHandlers.append(...message.result);
            console.log(`contexts:${commands}`);
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
        if (event.key === 'Enter' && event.ctrlKey) {
            handleSendClick(event as any);
        }
    };

    const defaultMessages = (<Center>
        <Text size="lg" color="gray" weight={500}>No messages yet</Text>
    </Center>);

    const commandMenus = commands.map(({ pattern, description, name }, index) => {
        return (
            <Menu.Item
                onClick={() => { setInput(`/${pattern} `); }}
                icon={<IconTerminal2 size={16} />}
            >
                <Text sx={{
                    fontSize: 'sm',
                    fontWeight: 'bolder',
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

    const contextMenus = contexts.map(({ pattern, description, name }, index) => {
        return (
            <Menu.Item
                onClick={() => { setInput(`/${name} `); }}
                icon={<IconMessagePlus size={16} />}
            >
                <Text sx={{
                    fontSize: 'sm',
                    fontWeight: 'bolder',
                }}>
                    /{name}
                </Text>
                <Text sx={{
                    fontSize: 'sm',
                    color: theme.colors.gray[6],
                }}>
                    {description}
                </Text>
            </Menu.Item>);
    });


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
                }}>
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
                    {(generating && messageType === 'bot' && index === messages.length - 1) ? <Text sx={{
                        animation: `${blink} 0.5s infinite;`,
                        width: 5,
                        marginTop: responsed ? 0 : '1em',
                        backgroundColor: 'black'
                    }}>|</Text> : ''}
                </Container>
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
                backgroundColor: theme.colors.gray[0],
            }}>
            <ScrollArea
                id='chat-scroll-area'
                h={height - px('5rem')}
                type="never"
                viewportRef={scrollViewport}>
                {messageList.length > 0 ? messageList : defaultMessages}
            </ScrollArea>
            <Menu
                id='commandMenu'
                position='top-start'
                closeOnClickOutside={true}
                shadow="xs"
                width={scrollViewport.current?.clientWidth}
                opened={menuOpend}
                onChange={setMenuOpend}
                onClose={() => setMenuType('')}
                onOpen={() => menuType !== '' ? setMenuOpend(true) : setMenuOpend(false)}
                returnFocus={true}>
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
                        sx={{ pointerEvents: 'all', position: 'absolute', bottom: 10, width: scrollViewport.current?.clientWidth }}
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
                </Menu.Target>

                {
                    menuType === 'contexts'
                        ? (<Menu.Dropdown>
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
                            {contextMenus}
                        </Menu.Dropdown>)
                        : menuType === 'commands'
                            ? <Menu.Dropdown>
                                <Menu.Label>DevChat Commands</Menu.Label>
                                {commandMenus}
                            </Menu.Dropdown>
                            : <></>
                }
            </Menu>
        </Container >
    );
};

export default chatPanel;