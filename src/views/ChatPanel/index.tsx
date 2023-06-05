import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { Accordion, Avatar, Box, Center, Container, Divider, Flex, Stack, px } from '@mantine/core';
import { ScrollArea } from '@mantine/core';
import { keyframes } from '@mantine/core';
import { Button, Text } from '@mantine/core';
import { useListState, useResizeObserver, useTimeout, useViewportSize } from '@mantine/hooks';
import { IconPlayerStop, IconRotateDot } from '@tabler/icons-react';
import messageUtil from '../../util/MessageUtil';
// @ts-ignore
import SvgAvatarDevChat from './avatar_devchat.svg';
// @ts-ignore
import SvgAvatarUser from './avatar_spaceman.png';

import InputMessage from './InputMessage';
import CodeBlock from './CodeBlock';


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
    const [chatContainerRef, chatContainerRect] = useResizeObserver();
    const scrollViewport = useRef<HTMLDivElement>(null);
    const [messages, messageHandlers] = useListState<{ type: string; message: string; contexts?: any[] }>([]);
    const [currentMessage, setCurrentMessage] = useState('');
    const [generating, setGenerating] = useState(false);
    const [responsed, setResponsed] = useState(false);
    const [registed, setRegisted] = useState(false);
    const [hasError, setHasError] = useState(false);
    const { height, width } = useViewportSize();
    const [scrollPosition, onScrollPositionChange] = useState({ x: 0, y: 0 });
    const [stopScrolling, setStopScrolling] = useState(false);
    const messageCount = 10;

    const scrollToBottom = () =>
        scrollViewport?.current?.scrollTo({ top: scrollViewport.current.scrollHeight, behavior: 'smooth' });

    const timer = useTimeout(() => {
        // console.log(`stopScrolling:${stopScrolling}`);
        if (!stopScrolling) {
            scrollToBottom();
        }
    }, 1000);

    useEffect(() => {
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
        messageUtil.registerHandler('loadHistoryMessages', (message: { command: string; entries: [{ hash: '', user: '', date: '', request: '', response: '', context: [{ content: '', role: '' }] }] }) => {
            message.entries?.forEach(({ hash, user, date, request, response, context }, index) => {
                if (index < message.entries.length - messageCount) return;
                const contexts = context.map(({ content, role }) => ({ context: JSON.parse(content) }));
                messageHandlers.append({ type: 'user', message: request, contexts: contexts });
                messageHandlers.append({ type: 'bot', message: response });
            });
        });
    }, [registed]);

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
                <InputMessage
                    generating={generating}
                    chatContainerRect={chatContainerRect}
                    onSendClick={(input: string, contexts: any) => {
                        // Add the user's message to the chat UI
                        messageHandlers.append({ type: 'user', message: input, contexts: contexts ? [...contexts].map((item) => ({ ...item })) : undefined });
                        // start generating
                        setGenerating(true);
                        setResponsed(false);
                        setCurrentMessage('');
                    }} />
            </Stack>
        </Container >
    );
};

export default chatPanel;