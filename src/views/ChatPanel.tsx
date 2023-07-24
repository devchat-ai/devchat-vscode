import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { Alert, Center, Container, Stack, px } from '@mantine/core';
import { ScrollArea } from '@mantine/core';
import { Button } from '@mantine/core';
import { useListState, useResizeObserver, useTimeout, useViewportSize } from '@mantine/hooks';
import { IconPlayerStop, IconRotateDot } from '@tabler/icons-react';
import messageUtil from '@/util/MessageUtil';
import { useAppDispatch, useAppSelector } from '@/views/hooks';
import CurrentMessage from "@/views/CurrentMessage";

import {
    reGenerating,
    stopGenerating,
    startResponsing,
    happendError,
    selectGenerating,
    selectErrorMessage,
    selectIsBottom,
    selectIsLastPage,
    onMessagesBottom,
    onMessagesTop,
    onMessagesMiddle,
    fetchHistoryMessages,
	newMessage,
	startSystemMessage,
} from './chatSlice';

import InputMessage from './InputMessage';
import MessageContainer from './MessageContainer';
import { clearContexts, setValue } from './inputSlice';

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
                dispatch(stopGenerating({ hasDone: false, message: null }));
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
    const isBottom = useAppSelector(selectIsBottom);
    const isLastPage = useAppSelector(selectIsLastPage);
    const errorMessage = useAppSelector(selectErrorMessage);
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
            timer.start();
        });
        messageUtil.registerHandler('receiveMessage', (message: { text: string; isError: boolean, hash }) => {
            dispatch(stopGenerating({ hasDone: true, message: message }));
            if (message.isError) {
                dispatch(happendError(message.text));
            }
        });

		messageUtil.registerHandler('systemMessage', (message: { text: string }) => {
            dispatch(newMessage({ type: 'system', message: message.text}));
            // start generating
            dispatch(startSystemMessage(message.text));
            // Clear the input field
            dispatch(setValue(''));
            dispatch(clearContexts());
        });

        timer.start();
        return () => {
            timer.clear();
        };
    }, []);

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
                <CurrentMessage width={chatContainerRect.width} />
                {errorMessage &&
                    <Alert styles={{ message: { fontSize: 'var(--vscode-editor-font-size)' } }} w={chatContainerRect.width} mb={20} color="gray" variant="filled">
                        {errorMessage}
                    </Alert>}
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