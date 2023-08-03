
import React, { useEffect } from "react";
import { keyframes } from "@emotion/react";
import { Container, Text } from "@mantine/core";
import { useAppDispatch, useAppSelector } from '@/views/hooks';
import CodeBlock from "@/views/components/CodeBlock";

import {
    newMessage,
    updateLastMessage,
    selectGenerating,
    selectCurrentMessage,
    selecLastMessage,
    selectResponsed,
} from '@/views/reducers/chatSlice';

const MessageBlink = () => {
    const responsed = useAppSelector(selectResponsed);

    const blink = keyframes({
        '50%': { opacity: 0 },
    });

    return <Text sx={{
        animation: `${blink} 0.5s infinite;`,
        width: 5,
        marginTop: responsed ? 0 : '1em',
        backgroundColor: 'black',
        display: 'block'
    }}>|</Text>;
};

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

const CurrentMessage = (props: any) => {
    const { width } = props;

    const dispatch = useAppDispatch();
    const currentMessage = useAppSelector(selectCurrentMessage);
    const lastMessage = useAppSelector(selecLastMessage);
    const generating = useAppSelector(selectGenerating);
    const responsed = useAppSelector(selectResponsed);

    // split blocks
    const messageBlocks = getBlocks(currentMessage);
    const lastMessageBlocks = getBlocks(lastMessage?.message);
    const fixedCount = lastMessageBlocks.length;
    const receivedCount = messageBlocks.length;
    const renderBlocks = messageBlocks.splice(-1);

    useEffect(() => {
        if (generating) {
            // new a bot message
            dispatch(newMessage({ type: 'bot', message: currentMessage }));
        }
    }, [generating]);

    useEffect(() => {
        if (receivedCount - fixedCount >= 1 || !responsed) {
            dispatch(updateLastMessage({ type: 'bot', message: currentMessage }));
        }
    }, [currentMessage, responsed]);

    return generating
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
};

export default CurrentMessage;