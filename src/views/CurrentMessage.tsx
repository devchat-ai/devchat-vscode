
import React, { useEffect } from "react";
import { keyframes } from "@emotion/react";
import { Text } from "@mantine/core";
import {
    selectResponsed,
} from './chatSlice';
import { useAppDispatch, useAppSelector } from '@/views/hooks';
import CodeBlock from "@/views/CodeBlock";

import {
    newMessage,
    selectGenerating,
    selectCurrentMessage,
} from './chatSlice';

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

const CurrentMessage = () => {
    const dispatch = useAppDispatch();
    const currentMessage = useAppSelector(selectCurrentMessage);
    const generating = useAppSelector(selectGenerating);

    useEffect(() => {
        if (generating) {
            // new a bot message
            dispatch(newMessage({ type: 'bot', message: currentMessage }));
        }
    }, [generating]);

    // Add the received message to the chat UI as a bot message
    useEffect(() => {
        //     const lastIndex = messages?.length - 1;
        //     const lastMessage = messages[lastIndex];
        //     if (currentMessage && lastMessage?.type === 'bot') {
        // update the last one bot message
        // messageHandlers.setItem();
        // dispatch(updateMessage({
        //     index: lastIndex,
        //     newMessage: { type: 'bot', message: currentMessage }
        // }));
        //     }
        // timer.start();
    }, [currentMessage]);


    return generating
        ? <>
            <CodeBlock messageText={currentMessage} messageType="bot" />
            <MessageBlink />
        </>
        : <></>;
};

export default CurrentMessage;