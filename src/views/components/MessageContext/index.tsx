

import { IInputStore } from "@/views/stores/InputStore";
import { Accordion, Box, Center, Text } from "@mantine/core";
import React from "react";

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
                        const { content, command, file, path } = item;
                        return (
                            <Accordion.Item key={`item-${index}`} value={`item-value-${index}`} mah='200'>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <Accordion.Control >
                                        <Text truncate='end'>{command ? command : path}</Text>
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

export default MessageContext;