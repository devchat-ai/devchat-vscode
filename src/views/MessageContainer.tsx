import { keyframes } from "@emotion/react";
import { Center, Text, Flex, Avatar, Accordion, Box, Stack, Container, Divider, ActionIcon, Tooltip } from "@mantine/core";
import React from "react";
import CodeBlock from "@/views/CodeBlock";

// @ts-ignore
import SvgAvatarDevChat from '@/views/avatar_devchat.svg';
// @ts-ignore
import SvgAvatarUser from '@/views/avatar_spaceman.png';
import { IconCheck, IconCopy } from "@tabler/icons-react";

import { useAppDispatch, useAppSelector } from '@/views/hooks';
import {
    selectGenerating,
    selectResponsed,
    selectMessages,
} from './chatSlice';
import {
    setContexts,
    setValue,
} from './inputSlice';


const MessageBlink = (props: any) => {
    const { messageType, lastMessage } = props;

    const generating = useAppSelector(selectGenerating);
    const responsed = useAppSelector(selectResponsed);

    const blink = keyframes({
        '50%': { opacity: 0 },
    });

    return (generating && messageType === 'bot' && lastMessage
        ? <Text sx={{
            animation: `${blink} 0.5s infinite;`,
            width: 5,
            marginTop: responsed ? 0 : '1em',
            backgroundColor: 'black',
            display: 'block'

        }}>|</Text>
        : <></>);
};

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

const MessageHeader = (props: any) => {
    const { type, message, contexts } = props;
    const dispatch = useAppDispatch();
    const [refilled, setRefilled] = React.useState(false);
    return (<Flex
        m='10px 0 10px 0'
        gap="sm"
        justify="flex-start"
        align="center"
        direction="row"
        wrap="wrap">
        {
            type === 'bot'
                ? <Avatar
                    color="indigo"
                    size={25}
                    radius="xl"
                    src={SvgAvatarDevChat} />
                : <Avatar
                    color="cyan"
                    size={25}
                    radius="xl"
                    src={SvgAvatarUser} />
        }
        <Text weight='bold'>{type === 'bot' ? 'DevChat' : 'User'}</Text>
        {type === 'user'
            ? <Tooltip sx={{ padding: '3px', fontSize: 'var(--vscode-editor-font-size)' }} label={refilled ? 'Refilled' : 'Refill prompt'} withArrow position="left" color="gray">
                <ActionIcon size='sm' style={{ marginLeft: 'auto' }}
                    onClick={() => {
                        dispatch(setValue(message));
                        dispatch(setContexts(contexts));
                        setRefilled(true);
                        setTimeout(() => { setRefilled(false); }, 2000);
                    }}>
                    {refilled ? <IconCheck size="1rem" /> : <IconCopy size="1.125rem" />}
                </ActionIcon>
            </Tooltip>
            : <></>
        }
    </Flex>);
};

const MessageContainer = (props: any) => {
    const { width } = props;

    const messages = useAppSelector(selectMessages);

    return messages.map((item: any, index: number) => {
        const { message: messageText, type: messageType, contexts } = item;
        // setMessage(messageText);
        return <Stack
            spacing={0}
            key={`message-${index}`}
            sx={{
                width: width,
                padding: 0,
                margin: 0,
            }}>
            <MessageHeader
                key={`message-header-${index}`}
                type={messageType}
                message={messageText}
                contexts={contexts} />
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
                <MessageBlink key={`message-blink-${index}`} messageType={messageType} lastMessage={index === messages.length - 1} />
            </Container >
            {index !== messages.length - 1 && <Divider my={3} key={`message-divider-${index}`} />}
        </Stack >;
    });
};

export default MessageContainer;