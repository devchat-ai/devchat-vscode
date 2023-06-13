import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { Alert, Center, Container, Stack, px } from '@mantine/core';
import { ScrollArea } from '@mantine/core';
import { Button } from '@mantine/core';
import { useListState, useResizeObserver, useTimeout, useViewportSize } from '@mantine/hooks';
import { IconPlayerStop, IconRotateDot } from '@tabler/icons-react';
import messageUtil from '../util/MessageUtil';
import { useAppDispatch, useAppSelector } from './hooks';

import {
    setValue
} from './inputSlice';
import {
    reGenerating,
    stopGenerating,
    startResponsing,
    happendError,
    newMessage,
    updateMessage,
    shiftMessage,
    selectGenerating,
    selectCurrentMessage,
    selectErrorMessage,
    selectMessages,
} from './chatSlice';

import InputMessage from './InputMessage';
import MessageContainer from './MessageContainer';

const RegenerationButton = () => {
    const dispatch = useAppDispatch();
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
        onClick={() => dispatch(reGenerating())}
        variant="white" >
        Regeneration
    </Button >);
};

const StopButton = () => {
    const dispatch = useAppDispatch();
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
            onClick={() => {
                dispatch(stopGenerating());
                messageUtil.sendMessage({
                    command: 'stopDevChat'
                });
            }}
            variant="white">
            Stop generating
        </Button>);
};

const chatPanel = () => {
    const dispatch = useAppDispatch();
    const generating = useAppSelector(selectGenerating);
    const currentMessage = useAppSelector(selectCurrentMessage);
    const errorMessage = useAppSelector(selectErrorMessage);
    const messages = useAppSelector(selectMessages);
    const [chatContainerRef, chatContainerRect] = useResizeObserver();
    const scrollViewport = useRef<HTMLDivElement>(null);
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
        messageUtil.sendMessage({ command: 'historyMessages' });
        messageUtil.registerHandler('receiveMessagePartial', (message: { text: string; }) => {
            dispatch(startResponsing(message.text));
        });
        messageUtil.registerHandler('receiveMessage', (message: { text: string; isError: boolean }) => {
            dispatch(stopGenerating());
            if (message.isError) {
                dispatch(happendError(message.text));
            }
        });
        messageUtil.registerHandler('loadHistoryMessages', (message: { command: string; entries: [{ hash: '', user: '', date: '', request: '', response: '', context: [{ content: '', role: '' }] }] }) => {
            message.entries?.forEach(({ hash, user, date, request, response, context }, index) => {
                if (index < message.entries.length - messageCount) return;
                const contexts = context?.map(({ content, role }) => ({ context: JSON.parse(content) }));
                dispatch(newMessage({ type: 'user', message: request, contexts: contexts }));
                dispatch(newMessage({ type: 'bot', message: response }));
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
            dispatch(newMessage({ type: 'bot', message: currentMessage }));
        }
    }, [generating]);

    // Add the received message to the chat UI as a bot message
    useEffect(() => {
        const lastIndex = messages?.length - 1;
        const lastMessage = messages[lastIndex];
        if (currentMessage && lastMessage?.type === 'bot') {
            // update the last one bot message
            // messageHandlers.setItem();
            dispatch(updateMessage({
                index: lastIndex,
                newMessage: { type: 'bot', message: currentMessage }
            }));
        }
        timer.start();
    }, [currentMessage]);

    useEffect(() => {
        if (messages.length > messageCount * 2) {
            dispatch(shiftMessage());
        }
        timer.start();
    }, [messages]);

    return (
        <Container
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
                type="never"
                sx={{
                    height: generating ? height - px('8rem') : height - px('5rem'),
                    width: chatContainerRect.width,
                    padding: 0,
                    margin: 0,
                }}
                onScrollPositionChange={onScrollPositionChange}
                viewportRef={scrollViewport}>
                <MessageContainer
                    width={chatContainerRect.width} />
                {errorMessage &&
                    <Alert styles={{ message: { fontSize: 'var(--vscode-editor-font-size)' } }} w={chatContainerRect.width} mb={20} color="gray" variant="filled">
                        {errorMessage}
                    </Alert>
                }
            </ScrollArea>
            <Stack
                spacing={5}
                sx={{ position: 'absolute', bottom: 10, width: 'calc(100% - 20px)' }}>
                {generating &&
                    <Center>
                        <StopButton />
                    </Center>
                }
                {errorMessage &&
                    <Center>
                        <RegenerationButton />
                    </Center>
                }
                <InputMessage
                    width={chatContainerRect.width} />
            </Stack>
        </Container>
    );
};

export default chatPanel;