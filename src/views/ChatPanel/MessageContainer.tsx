import { keyframes } from "@emotion/react";
import { Center, Text, Flex, Avatar, Accordion, Box, Stack, Container, Divider } from "@mantine/core";
import React from "react";
import CodeBlock from "./CodeBlock";

// @ts-ignore
import SvgAvatarDevChat from './avatar_devchat.svg';
// @ts-ignore
import SvgAvatarUser from './avatar_spaceman.png';

const MessageContainer = (props: any) => {
    const { generating, messages, width, responsed } = props;

    const DefaultMessage = (<Center>
        <Text size="lg" color="gray" weight={500}>No messages yet</Text>
    </Center>);

    const MessageAvatar = (props: any) => {
        const { type } = props;
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
        </Flex>);
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
                            <Accordion.Item value={`item-${index}`} mah='200'>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <Accordion.Control >
                                        {'command' in context ? context.command : context.path}
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

    const MessageBlink = (props: any) => {
        const { generating, messageType, lastMessage } = props;
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

    const messageList = messages.map((item: any, index: number) => {
        const { message: messageText, type: messageType, contexts } = item;
        // setMessage(messageText);
        return (<>
            <Stack
                spacing={0}
                key={`message-${index}`}
                sx={{
                    width: width,
                    padding: 0,
                    margin: 0,
                }}>
                <MessageAvatar type={messageType} />
                <Container sx={{
                    margin: 0,
                    padding: 0,
                    width: width,
                    pre: {
                        whiteSpace: 'break-spaces'
                    },
                }}>
                    <MessageContext contexts={contexts} />
                    <CodeBlock messageText={messageText} />
                    <MessageBlink generating={generating} messageType={messageType} lastMessage={index === messages.length - 1} />
                </Container >
            </Stack >
            {index !== messages.length - 1 && <Divider my={3} />}
        </>);
    });

    return (messageList.length > 0 ? messageList : DefaultMessage);
};

export default MessageContainer;