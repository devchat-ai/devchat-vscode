
import { Center, Text, Accordion, Box, Stack, Container, Divider, Alert, ActionIcon } from "@mantine/core";
import React from "react";
import CodeBlock from "@/views/components/CodeBlock";
import MessageHeader from "@/views/components/MessageHeader";
import { Virtuoso } from 'react-virtuoso';
import CurrentMessage from "@/views/components/CurrentMessage";
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';

import { useAppDispatch, useAppSelector } from '@/views/hooks';
import {
    selectMessages,
    selectErrorMessage,
    selectIsBottom,
    fetchHistoryMessages,
} from '@/views/reducers/chatSlice';
import { IconCircleArrowDownFilled } from "@tabler/icons-react";

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
                        <Accordion.Item key={`item-${index}`} value={`item-value-${index}`} mah='200'>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Accordion.Control >
                                    <Text truncate='end'>{'command' in context ? context.command : context.path}</Text>
                                </Accordion.Control>
                            </Box>
                            <Accordion.Panel>
                                {
                                    context.content
                                        ? <pre style={{ overflowWrap: 'normal' }}>{context.content}</pre>
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

const MessageItem = (props: any) => {

    const { index, width, item, total } = props;
    const { message: messageText, type: messageType, contexts } = item;

    return (<Stack
        spacing={0}
        key={`message-${index}`}
        sx={{
            width: width,
            padding: 0,
            margin: 0,
        }}>
        <MessageHeader
            key={`message-header-${index}`}
            showDelete={index === total - 2}
            item={item} />
        <Container
            key={`message-container-${index}`}
            sx={{
                margin: 0,
                padding: 0,
                width: width,
                pre: {
                    whiteSpace: 'break-spaces'
                },
            }}>
            <MessageContext key={`message-context-${index}`} contexts={contexts} />
            <CodeBlock key={`message-codeblock-${index}`} messageType={messageType} messageText={messageText} />
        </Container >
        {index !== total - 1 && <Divider my={3} key={`message-divider-${index}`} />}
    </Stack >);
};


const MessageContainer = (props: any) => {
    const dispatch = useAppDispatch();
    const messages = useAppSelector(selectMessages);
    const errorMessage = useAppSelector(selectErrorMessage);
    const isBottom = useAppSelector(selectIsBottom);
    const [align, setAlign] = useState("start");
    const [behavior, setBehavior] = useState("smooth");
    const virtuoso = useRef<any>(null);
    const { height, width } = props;
    const START_INDEX = 100;
    const INITIAL_ITEM_COUNT = 10;
    const [firstItemIndex, setFirstItemIndex] = useState(START_INDEX);

    const prependItems = useCallback(() => {
        const messagesToPrepend = 10;
        const nextFirstItemIndex = firstItemIndex - messagesToPrepend;

        setTimeout(() => {
            setFirstItemIndex(() => nextFirstItemIndex);
            const pageIndex = (START_INDEX - nextFirstItemIndex) / messagesToPrepend;
            dispatch(fetchHistoryMessages({ pageIndex: pageIndex, length: messagesToPrepend, startIndex: nextFirstItemIndex }));
        }, 500);

        return false;
    }, [firstItemIndex, messages]);

    useEffect(() => {
        dispatch(fetchHistoryMessages({ pageIndex: 0, length: INITIAL_ITEM_COUNT, startIndex: START_INDEX }));
    }, []);

    return (
        <>
            {!isBottom && <ActionIcon
                onClick={() => {
                    virtuoso.current?.scrollToIndex({
                        index: 499,
                        align,
                        behavior
                    });
                    return false;
                }}
                title='Bottom'
                variant='transparent' sx={{ position: "absolute", bottom: 60, right: 20, zIndex: 999 }}>
                <IconCircleArrowDownFilled size="1.125rem" />
            </ActionIcon>}
            <Virtuoso
                ref={virtuoso}
                style={{
                    height: height,
                    width: width,
                    padding: 0,
                    margin: 0,
                    overflowX: 'hidden',
                    overflowY: 'auto',
                }}
                overscan={200}
                alignToBottom={true}
                firstItemIndex={firstItemIndex}
                initialTopMostItemIndex={INITIAL_ITEM_COUNT - 1}
                data={messages}
                startReached={prependItems}
                itemContent={(index, item) => {
                    return (
                        <MessageItem index={index} item={item} width={width} total={messages.length} />
                    );
                }}
            />
            <CurrentMessage width={width} />
            {errorMessage &&
                <Alert styles={{ message: { fontSize: 'var(--vscode-editor-font-size)' } }} w={width} mb={20} color="gray" variant="filled">
                    {errorMessage}
                </Alert>}
        </>
    );
};


export default MessageContainer;