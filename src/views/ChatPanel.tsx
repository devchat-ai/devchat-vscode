import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { Alert, Center, Container, Stack, px } from '@mantine/core';
import { ScrollArea } from '@mantine/core';
import { Button } from '@mantine/core';
import { useListState, useResizeObserver, useTimeout, useViewportSize } from '@mantine/hooks';
import { IconPlayerStop, IconRotateDot } from '@tabler/icons-react';
import messageUtil from '@/util/MessageUtil';
import { useAppDispatch, useAppSelector } from '@/views/hooks';
import InfiniteScroll from 'react-infinite-scroll-component';

import {
    reGenerating,
    stopGenerating,
    startResponsing,
    happendError,
    selectGenerating,
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
    const errorMessage = useAppSelector(selectErrorMessage);
    const messages = useAppSelector(selectMessages);
    const isBottom = useAppSelector(selectIsBottom);
    const isLastPage = useAppSelector(selectIsLastPage);
    const pageIndex = useAppSelector(selectPageIndex);
    const [chatContainerRef, chatContainerRect] = useResizeObserver();
    const { height, width } = useViewportSize();

    const fetchMoreData = () => {
        dispatch(fetchHistoryMessages({ pageIndex: pageIndex + 1 }));
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
            <Container
                id="scrollableDiv"
                sx={{
                    maxHeight: generating ? height - px('7rem') : height - px('5rem'),
                    width: chatContainerRect.width,
                    padding: 0,
                    margin: 0,
                    display: 'flex',
                    overflow: 'auto',
                    flexDirection: 'column-reverse',
                    '&::-webkit-scrollbar': {
                        display: 'none'
                    }
                }}
            >
                <InfiniteScroll
                    dataLength={messages.length}
                    next={fetchMoreData}
                    style={{
                        display: 'flex',
                        contentVisibility: 'auto',
                        flexDirection: 'column-reverse'
                    }}
                    inverse={true}
                    hasMore={!isLastPage}
                    loader={<Center><h4>Loading...</h4></Center>}
                    scrollableTarget="scrollableDiv"
                >
                    {errorMessage &&
                        <Alert styles={{ message: { fontSize: 'var(--vscode-editor-font-size)' } }} w={chatContainerRect.width} mb={20} color="gray" variant="filled">
                            {errorMessage}
                        </Alert>
                    }
                    <MessageContainer
                        width={chatContainerRect.width} />
                </InfiniteScroll>
            </Container>
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
        </Container >
    );
};

export default chatPanel;