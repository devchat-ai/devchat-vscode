
import { Center, Text, Accordion, Box, Stack, Container, Divider } from "@mantine/core";
import React from "react";
import CodeBlock from "@/views/components/CodeBlock";
import MessageHeader from "@/views/components/MessageHeader";
import { observer } from "mobx-react-lite";
import { types } from "mobx-state-tree";
import { useMst } from "@/views/stores/RootStore";
import { IInputStore } from "@/views/stores/InputStore";

interface IProps {
    contexts?: IInputStore['contexts'];
}

const MessageContext = ({ contexts }: IProps) => {
    return (<>
        {
            contexts &&
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
                }}>
                {
                    contexts?.map((item, index: number) => {
                        const { content, command, file } = item;
                        return (
                            <Accordion.Item key={`item-${index}`} value={`item-value-${index}`} mah='200'>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <Accordion.Control >
                                        <Text truncate='end'>{command ? command : file}</Text>
                                    </Accordion.Control>
                                </Box>
                                <Accordion.Panel>
                                    {
                                        content
                                            ? <pre style={{ overflowWrap: 'normal' }}>{content}</pre>
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
        }
    </>);
};


const MessageContainer = observer((props: any) => {
    const { width } = props;
    const { chat } = useMst();

    return (<>
        {chat.messages.map((item, index: number) => {
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
                    showDelete={index === chat.messages.length - 2}
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
                {index !== chat.messages.length - 1 && <Divider my={3} key={`message-divider-${index}`} />}
            </Stack >;
        })}
    </>);
});

export default MessageContainer;