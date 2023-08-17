
import React, { useEffect } from "react";
import { keyframes } from "@emotion/react";
import { Container, Text } from "@mantine/core";
import CodeBlock from "@/views/components/CodeBlock";
import { observer } from "mobx-react-lite";
import { useMst } from "@/views/stores/RootStore";


const MessageBlink = observer(() => {
    const { chat } = useMst();

    const blink = keyframes({
        '50%': { opacity: 0 },
    });

    return <Text sx={{
        animation: `${blink} 0.5s infinite;`,
        width: 5,
        marginTop: chat.responsed ? 0 : '1em',
        backgroundColor: 'black',
        display: 'block'
    }}>|</Text>;
});

const getBlocks = (message) => {
    const messageText = message || '';
    const regex = /```([\s\S]+?)```/g;

    let match;
    let lastIndex = 0;
    const blocks: string[] = [];

    while ((match = regex.exec(messageText))) {
        const unmatchedText = messageText.substring(lastIndex, match.index);
        const matchedText = match[0];
        blocks.push(unmatchedText, matchedText);
        lastIndex = regex.lastIndex;
    }

    const unmatchedText = messageText.substring(lastIndex);
    blocks.push(unmatchedText);

    return blocks;
}

const CurrentMessage = observer((props: any) => {
    const { width } = props;
    const { chat } = useMst();

    // split blocks
    const messageBlocks = getBlocks(chat.currentMessage);
    const lastMessageBlocks = getBlocks(chat.lastMessage?.message);
    const fixedCount = lastMessageBlocks.length;
    const receivedCount = messageBlocks.length;
    const renderBlocks = messageBlocks.splice(-1);

    useEffect(() => {
        if (chat.generating) {
            // new a bot message
            chat.newMessage({ type: 'bot', message: chat.currentMessage });
        }
    }, [chat.generating]);

    useEffect(() => {
        if (receivedCount - fixedCount >= 1 || !chat.responsed) {
            chat.updateLastMessage({ type: 'bot', message: chat.currentMessage });
        }
    }, [chat.currentMessage, chat.responsed]);

    return chat.generating
        ? <Container
            sx={{
                margin: 0,
                padding: 0,
                width: width,
                pre: {
                    whiteSpace: 'break-spaces'
                },
            }}>
            <CodeBlock messageText={renderBlocks.join('\n\n')} messageType="bot" />
            <MessageBlink />
        </Container>
        : <></>;
});

export default CurrentMessage;