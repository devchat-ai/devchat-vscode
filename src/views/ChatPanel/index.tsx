import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { Center, Container, Stack, px } from '@mantine/core';
import { ScrollArea } from '@mantine/core';
import { Button } from '@mantine/core';
import { useListState, useResizeObserver, useTimeout, useViewportSize } from '@mantine/hooks';
import { IconPlayerStop, IconRotateDot } from '@tabler/icons-react';
import messageUtil from '../../util/MessageUtil';

import InputMessage from './InputMessage';
import MessageContainer from './MessageContainer';

const chatPanel = () => {
    const [chatContainerRef, chatContainerRect] = useResizeObserver();
    const scrollViewport = useRef<HTMLDivElement>(null);
    const [messages, messageHandlers] = useListState<{ type: string; message: string; contexts?: any[] }>([]);
    const [currentMessage, setCurrentMessage] = useState('');
    const [generating, setGenerating] = useState(false);
    const [responsed, setResponsed] = useState(false);
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
                // onScrollPositionChange={onScrollPositionChange}
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