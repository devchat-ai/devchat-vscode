import * as React from 'react';
import { useEffect } from 'react';
import { Stack } from '@mantine/core';
import { useResizeObserver, useViewportSize } from '@mantine/hooks';
import messageUtil from '@/util/MessageUtil';
import { useAppDispatch } from '@/views/hooks';

import {
    stopGenerating,
    startResponsing,
    happendError,
    newMessage,
    startSystemMessage,
} from '@/views/reducers/chatSlice';

import InputMessage from '@/views/components/InputMessage';
import MessageContainer from '../components/MessageContainer';
import { clearContexts, setValue } from '@/views/reducers/inputSlice';


const chatPanel = () => {
    const dispatch = useAppDispatch();
    const [chatContainerRef, chatContainerRect] = useResizeObserver();
    const { height, width } = useViewportSize();

    useEffect(() => {
        messageUtil.registerHandler('receiveMessagePartial', (message: { text: string; }) => {
            dispatch(startResponsing(message.text));
        });
        messageUtil.registerHandler('receiveMessage', (message: { text: string; isError: boolean, hash }) => {
            dispatch(stopGenerating({ hasDone: true, message: message }));
            if (message.isError) {
                dispatch(happendError(message.text));
            }
        });

        messageUtil.registerHandler('systemMessage', (message: { text: string }) => {
            dispatch(newMessage({ type: 'system', message: message.text }));
            // start generating
            dispatch(startSystemMessage(message.text));
            // Clear the input field
            dispatch(setValue(''));
            dispatch(clearContexts());
        });
    }, []);

    return (
        <Stack
            spacing='xs'
            ref={chatContainerRef}
            sx={{
                height: '100%',
                margin: 0,
                padding: 0,
                overflow: 'hidden',
                background: 'var(--vscode-sideBar-background)',
                color: 'var(--vscode-editor-foreground)'
            }}>
            <MessageContainer
                height={height} />
            <InputMessage
                width={chatContainerRect.width - 20} />
        </Stack>
    );
};

export default chatPanel;