import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { Accordion, AccordionControlProps, Avatar, Box, Center, Container, CopyButton, Divider, Flex, Grid, Stack, Textarea, TypographyStylesProvider, px, rem, useMantineTheme } from '@mantine/core';
import { Input, Tooltip } from '@mantine/core';
import { List } from '@mantine/core';
import { ScrollArea } from '@mantine/core';
import { createStyles, keyframes } from '@mantine/core';
import { ActionIcon } from '@mantine/core';
import { Menu, Button, Text } from '@mantine/core';
import { useElementSize, useListState, useResizeObserver, useViewportSize } from '@mantine/hooks';
import { IconAdjustments, IconBulb, IconCameraSelfie, IconCheck, IconClick, IconColumnInsertRight, IconCopy, IconDots, IconEdit, IconFileDiff, IconFolder, IconGitCompare, IconMessageDots, IconMessagePlus, IconPrinter, IconPrompt, IconReplace, IconRobot, IconSend, IconSquareRoundedPlus, IconTerminal2, IconUser, IconX } from '@tabler/icons-react';
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

    const handleContextClick = (contextName: string) => {
        // Process and send the message to the extension
        messageUtil.sendMessage({
            command: 'addContext',
            selected: contextName
        });
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
                contextsHandlers.append(context);
                console.log(context);
            }
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

    const commandMenusNode = commandMenus.map(({ pattern, description, name }, index) => {
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

    const contextMenusNode = contextMenus.map(({ pattern, description, name }, index) => {
        return (
            <Menu.Item
                onClick={() => {
                    handleContextClick(name);
                }}
                icon={<IconMessagePlus size={16} />}
            >
                <Text sx={{
                    fontSize: 'sm',
                    fontWeight: 'bolder',
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
                                            <Tooltip label='View-diff' withArrow position="left" color="gray">
                                                <ActionIcon>
                                                    <IconFileDiff size="1.125rem" />
                                                </ActionIcon>
                                            </Tooltip>
                                            <Tooltip label='Insert Code' withArrow position="left" color="gray">
                                                <ActionIcon>
                                                    <IconColumnInsertRight size="1.125rem" />
                                                </ActionIcon>
                                            </Tooltip>
                                            <Tooltip label='Replace' withArrow position="left" color="gray">
                                                <ActionIcon>
                                                    <IconReplace size="1.125rem" />
                                                </ActionIcon>
                                            </Tooltip>
                                        </Flex>
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
            <Stack sx={{ position: 'absolute', bottom: 10, width: scrollViewport.current?.clientWidth }}>
                <Accordion variant="contained" chevronPosition="left" style={{ backgroundColor: '#FFF' }}>
                    {
                        contexts.map((context, index) => {
                            return (
                                <Accordion.Item value={`item-${index}`} mah='200'>
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                        <Accordion.Control >
                                            {'command' in context ? context.command : context.path}
                                        </Accordion.Control>
                                        <ActionIcon
                                            mr={8}
                                            size="lg"
                                            onClick={() => {
                                                contextsHandlers.remove(index);
                                            }}>
                                            <IconX size="1rem" />
                                        </ActionIcon>
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
                                {contextMenusNode}
                            </Menu.Dropdown>)
                            : menuType === 'commands'
                                ? <Menu.Dropdown>
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