import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { Alert, Center, Container, Stack, px } from '@mantine/core';
import { ScrollArea } from '@mantine/core';
import { Button } from '@mantine/core';
import { useListState, useResizeObserver, useTimeout, useViewportSize } from '@mantine/hooks';
import { IconPlayerStop, IconRotateDot } from '@tabler/icons-react';
import messageUtil from '@/util/MessageUtil';
import { useAppDispatch, useAppSelector } from '@/views/hooks';

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
    selectIsBottom,
    selectPageIndex,
    selectIsLastPage,
    onMessagesBottom,
    onMessagesTop,
    onMessagesMiddle,
    fetchHistoryMessages,
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
    const isBottom = useAppSelector(selectIsBottom);
    const isLastPage = useAppSelector(selectIsLastPage);
    const pageIndex = useAppSelector(selectPageIndex);
    const [chatContainerRef, chatContainerRect] = useResizeObserver();
    const scrollViewport = useRef<HTMLDivElement>(null);
    const { height, width } = useViewportSize();

    const scrollToBottom = () =>
        scrollViewport?.current?.scrollTo({ top: scrollViewport.current.scrollHeight, behavior: 'smooth' });

    const timer = useTimeout(() => {
        if (isBottom) {
            scrollToBottom();
        }
    }, 1000);

    const onScrollPositionChange = ({ x, y }) => {
        const sh = scrollViewport.current?.scrollHeight || 0;
        const vh = scrollViewport.current?.clientHeight || 0;
        const gap = sh - vh - y;
        const isBottom = sh < vh ? true : gap < 100;
        const isTop = y === 0;
        // console.log(`sh:${sh},vh:${vh},x:${x},y:${y},gap:${gap}`);
        if (isBottom) {
            dispatch(onMessagesBottom());
        } else if (isTop) {
            dispatch(onMessagesTop());
            if (!isLastPage) {
                //TODO: Data loading flickers and has poor performance, so I temporarily disabled the loading logic.
                // dispatch(fetchHistoryMessages({ pageIndex: pageIndex + 1 }));
            }
        } else {
            dispatch(onMessagesMiddle());
        }
    };

    useEffect(() => {
        dispatch(fetchHistoryMessages({ pageIndex: 0 }));
        messageUtil.registerHandler('receiveMessagePartial', (message: { text: string; }) => {
            dispatch(startResponsing(message.text));
        });
        messageUtil.registerHandler('receiveMessage', (message: { text: string; isError: boolean }) => {
            dispatch(stopGenerating());
            if (message.isError) {
                dispatch(happendError(message.text));
            }
        });
        timer.start();
        return () => {
            timer.clear();
        };
    }, []);

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