import * as React from 'react';
import { useEffect, useRef } from 'react';
import { ActionIcon, Alert, Anchor, Box, Button, Center, Chip, Container, Flex, Group, Radio, Stack, px } from '@mantine/core';
import { ScrollArea } from '@mantine/core';
import { useInterval, useResizeObserver, useTimeout, useViewportSize } from '@mantine/hooks';
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

    const getSettings = () => {
        messageUtil.sendMessage({
            command: "getSetting",
            key1: "DevChat",
            key2: "OpenAI.model"
        });
    };

    const getFeatureToggles = () => {
        messageUtil.sendMessage({
            command: "featureToggles"
        });
    };

    const timer = useTimeout(() => {
        if (chat.isBottom) {
            scrollToBottom();
        }
    }, 1000);

    const interval = useInterval(() => {
        getSettings();
    }, 3000);

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
        getSettings();
        getFeatureToggles();
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
        messageUtil.registerHandler('getSetting', (message: { value: string }) => {
            chat.changeChatModel(message.value);
        });
        messageUtil.registerHandler('featureToggles', (message: { features: object }) => {
            // chat.changeChatModel(message.value);
            chat.updateFeatures(message.features);
        });


        timer.start();
        interval.start();
        return () => {
            timer.clear();
            interval.stop();
        };
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [chat.scrollBottom]);

    return (
        <Box
            ref={chatContainerRef}
            miw={310}
            sx={{
                height: '100%',
                margin: 0,
                padding: '10px 10px 5px 10px',
                background: 'var(--vscode-sideBar-background)',
                color: 'var(--vscode-editor-foreground)'
            }}>
            {!chat.isBottom && <ActionIcon
                onClick={() => { scrollToBottom() }}
                title='Bottom'
                variant='transparent' sx={{ position: "absolute", bottom: 80, right: 20, zIndex: 1 }}>
                <IconCircleArrowDownFilled size="1.125rem" />
            </ActionIcon>}
            <ScrollArea
                sx={{
                    height: chat.generating ? height - px('9rem') : height - px('6rem'),
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
                spacing={0}
                sx={{ position: 'absolute', bottom: 10, width: chatPanelWidth - 20 }}>
                {chat.generating &&
                    <Center mb={5}>
                        <StopButton />
                    </Center>
                }
                {chat.errorMessage &&
                    <Center mb={5}>
                        <RegenerationButton />
                    </Center>
                }
                <InputMessage chatPanelWidth={chatPanelWidth} />
                <Chip.Group multiple={false}
                    value={chat.chatModel}
                    onChange={(value) => {
                        chat.changeChatModel(value);
                        messageUtil.sendMessage({
                            command: 'updateSetting',
                            key1: "DevChat",
                            key2: "OpenAI.model",
                            value: value
                        });
                    }} >
                    <Group position="left" spacing={5} mt={5}>
                        <Chip size="xs" value="gpt-4">GPT-4</Chip>
                        <Chip size="xs" value="gpt-3.5-turbo">GPT-3.5</Chip>
                        <Chip size="xs" value="gpt-3.5-turbo-16k">GPT-3.5-16K</Chip>
                    </Group>
                </Chip.Group>
            </Stack>
        </Box>
    );
});

export default chatPanel;