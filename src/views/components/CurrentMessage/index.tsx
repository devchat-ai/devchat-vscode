
import React, { useEffect, useState } from "react";
import { keyframes } from "@emotion/react";
import { Box, Container, Text } from "@mantine/core";
import MessageBody from "@/views/components/MessageBody";
import { observer } from "mobx-react-lite";
import { useMst } from "@/views/stores/RootStore";
import { Message } from "@/views/stores/ChatStore";
import {fromMarkdown} from 'mdast-util-from-markdown';
import {toMarkdown} from 'mdast-util-to-markdown';

const MessageBlink = observer(() => {
    const { chat } = useMst();

    const blink = keyframes({
        '50%': { opacity: 0 },
    });

    return <Text sx={{
        animation: `${blink} 0.5s infinite;`,
        width: 5,
        marginTop: '1em',
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
};

const CurrentMessage = observer((props: any) => {
    const { width } = props;
    const { chat } = useMst();
    const { messages, currentMessage, generating, responsed, hasDone } = chat;
    // split blocks
    const messageBlocks = fromMarkdown(currentMessage);
    const lastMessageBlocks = fromMarkdown(messages[messages.length - 1]?.message);
    const fixedCount = lastMessageBlocks.children.length;
    const receivedCount = messageBlocks.children.length;
    const renderBlocks = messageBlocks.children.splice(-1);

    useEffect(() => {
        if (generating) {
            // new a bot message
            const messageItem = Message.create({ type: 'bot', message: currentMessage });
            chat.newMessage(messageItem);
        }
    }, [generating]);

    useEffect(() => {
        if (generating && (receivedCount - fixedCount >= 1 || !responsed)) {
            chat.updateLastMessage(toMarkdown({
                    type: 'root',
                    children: messageBlocks.children
                }));
        }
    }, [currentMessage, responsed, generating]);

    useEffect(() => {
        if (hasDone) {
            chat.updateLastMessage(currentMessage);
        }
    }, [hasDone]);

    return generating
        ? <Box
            sx={{
                padding: 0,
                marginTop: -5,
                marginBottom: 50,
                width: width,
                pre: {
                    margin: 0,
                    whiteSpace: 'break-spaces'
                },
            }}>
            <MessageBody messageType="bot" temp={true} >
                {renderBlocks.length>0?toMarkdown(renderBlocks[0]):''}
            </MessageBody>
            <MessageBlink />
        </Box>
        : <></>;
});

export default CurrentMessage;