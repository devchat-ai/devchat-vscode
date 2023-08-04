import * as React from 'react';
import { useEffect, useRef } from 'react';
import { Center, Container, Stack, px } from '@mantine/core';
import { useResizeObserver, useViewportSize } from '@mantine/hooks';
import messageUtil from '@/util/MessageUtil';
import { useAppDispatch, useAppSelector } from '@/views/hooks';
import StopButton from '@/views/components/StopButton';
import RegenerationButton from '@/views/components/RegenerationButton';

import {
    stopGenerating,
    startResponsing,
    happendError,
    selectGenerating,
    selectErrorMessage,
    newMessage,
    startSystemMessage,
} from '@/views/reducers/chatSlice';

import InputMessage from '@/views/components/InputMessage';
import MessageContainer from '../components/MessageContainer';
import { clearContexts, setValue } from '@/views/reducers/inputSlice';


const chatPanel = () => {
    const dispatch = useAppDispatch();
    const generating = useAppSelector(selectGenerating);
    const errorMessage = useAppSelector(selectErrorMessage);
    const [chatContainerRef, chatContainerRect] = useResizeObserver();
    const scrollViewport = useRef<HTMLDivElement>(null);
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
            <MessageContainer
                height={generating ? height - px('8rem') : height - px('5rem')}
                width={chatContainerRect.width} />
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