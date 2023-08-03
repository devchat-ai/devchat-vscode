
import { Center, Text, Accordion, Box, Stack, Container, Divider } from "@mantine/core";
import React from "react";
import CodeBlock from "@/views/components/CodeBlock";
import MessageHeader from "@/views/MessageHeader";

import { useAppSelector } from '@/views/hooks';
import {
    selectMessages,
} from '@/views/reducers/chatSlice';


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
                showDelete={index === messages.length - 2}
                item={item} />
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
            </Container >
            {index !== messages.length - 1 && <Divider my={3} key={`message-divider-${index}`} />}
        </Stack >;
    });
};

export default MessageContainer;