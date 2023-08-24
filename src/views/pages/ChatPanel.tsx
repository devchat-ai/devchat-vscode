import * as React from 'react';
import { useEffect, useRef } from 'react';
import { ActionIcon, Alert, Anchor, Box, Button, Center, Container, Stack, px } from '@mantine/core';
import { ScrollArea } from '@mantine/core';
import { useResizeObserver, useTimeout, useViewportSize } from '@mantine/hooks';
import messageUtil from '@/util/MessageUtil';
import CurrentMessage from "@/views/components/CurrentMessage";
import StopButton from '@/views/components/StopButton';
import RegenerationButton from '@/views/components/RegenerationButton';
import { observer } from "mobx-react-lite";
import { useMst } from "@/views/stores/RootStore";
import { Message } from "@/views/stores/ChatStore";


import InputMessage from '@/views/components/InputMessage';
import MessageList from '@/views/components/MessageList';
import { IconCircleArrowDown, IconCircleArrowDownFilled, IconExternalLink } from '@tabler/icons-react';


const chatPanel = observer(() => {
    const { input, chat } = useMst();

    const [chatContainerRef, chatContainerRect] = useResizeObserver();
    const scrollViewport = useRef<HTMLDivElement>(null);
    const { height, width } = useViewportSize();

    const chatPanelWidth = chatContainerRect.width;

    const scrollToBottom = () =>
        scrollViewport?.current?.scrollTo({ top: scrollViewport.current.scrollHeight, behavior: 'smooth' });

    const timer = useTimeout(() => {
        if (chat.isBottom) {
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
            chat.onMessagesBottom();
        } else if (isTop) {
            chat.onMessagesTop()
            if (!chat.isLastPage) {
                //TODO: Data loading flickers and has poor performance, so I temporarily disabled the loading logic.
                // dispatch(fetchHistoryMessages({ pageIndex: pageIndex + 1 }));
            }
        } else {
            chat.onMessagesMiddle();
        }
    };

    useEffect(() => {
        chat.fetchHistoryMessages({ pageIndex: 0 }).then();
        messageUtil.registerHandler('receiveMessagePartial', (message: { text: string; }) => {
            chat.startResponsing(message.text);
            timer.start();
        });
        messageUtil.registerHandler('receiveMessage', (message: { text: string; isError: boolean, hash }) => {
            const messageItem = Message.create({ type: 'bot', message: message.text, hash: message.hash });
            chat.stopGenerating(true, messageItem);
            if (message.isError) {
                chat.happendError(message.text);
            }
        });

        messageUtil.registerHandler('systemMessage', (message: { text: string }) => {
            const messageItem = Message.create({ type: 'system', message: message.text });
            chat.newMessage(messageItem);
            // start generating
            chat.startSystemMessage();
            // Clear the input field
            input.setValue('');
            input.clearContexts();
        });

        timer.start();
        return () => {
            timer.clear();
        };
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [chat.scrollBottom]);

    return (
        <Box
            ref={chatContainerRef}
            sx={{
                height: '100%',
                margin: 0,
                padding: 10,
                background: 'var(--vscode-sideBar-background)',
                color: 'var(--vscode-editor-foreground)',
                minWidth: 240
            }}>
            {!chat.isBottom && <ActionIcon
                onClick={() => { scrollToBottom() }}
                title='Bottom'
                variant='transparent' sx={{ position: "absolute", bottom: 60, right: 20, zIndex: 999 }}>
                <IconCircleArrowDownFilled size="1.125rem" />
            </ActionIcon>}
            <ScrollArea
                sx={{
                    height: chat.generating ? height - px('8rem') : height - px('5rem'),
                    padding: 0,
                    margin: 0,
                }}
                onScrollPositionChange={onScrollPositionChange}
                viewportRef={scrollViewport}>
                <MessageList chatPanelWidth={chatPanelWidth} />
                <CurrentMessage />
                {chat.errorMessage &&
                    <Box mb={20} >
                        <Alert styles={{ message: { fontSize: 'var(--vscode-editor-font-size)' } }} w={chatContainerRect.width} color="gray" variant="filled">
                            {chat.errorMessage}
                        </Alert>
                        {
                            chat.errorMessage.search('Insufficient balance') > -1 &&
                            <Button size='xs' component="a" href={chat.rechargeSite} mt={5} variant="outline" leftIcon={<IconExternalLink size="0.9rem" />}>
                                Open official website to recharge.
                            </Button>
                        }
                    </Box>
                }
            </ScrollArea>
            <Stack
                spacing={5}
                sx={{ position: 'absolute', bottom: 10, width: 'calc(100% - 20px)' }}>
                {chat.generating &&
                    <Center>
                        <StopButton />
                    </Center>
                }
                {chat.errorMessage &&
                    <Center>
                        <RegenerationButton />
                    </Center>
                }
                <InputMessage chatPanelWidth={chatPanelWidth} />
            </Stack>
        </Box>
    );
});

export default chatPanel;