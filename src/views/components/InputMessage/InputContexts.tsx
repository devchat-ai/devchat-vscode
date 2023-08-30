import { Accordion, Box, ActionIcon, ScrollArea, Center, Text } from "@mantine/core";
import { IconX } from "@tabler/icons-react";
import React from "react";
import { observer } from "mobx-react-lite";
import { useMst } from "@/views/stores/RootStore";
import { ChatContext } from "@/views/stores/InputStore";

const InputContexts = observer(() => {
    const { input } = useMst();
    return (<Accordion
        variant="contained"
        chevronPosition="left"
        multiple={true}
        sx={{
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
                overflow: 'hidden',
            },
            content: {
                borderRadius: 3,
                backgroundColor: 'var(--vscode-menu-background)',
            }
        }}>
        {
            input.contexts.map((context, index: number) => {
                const { content, command, file, path } = context;
                return (
                    <Accordion.Item key={`item-${index}`} value={`item-value-${index}`} >
                        <Box sx={{
                            display: 'flex', alignItems: 'center',
                            backgroundColor: 'var(--vscode-menu-background)',
                        }}>
                            <Accordion.Control w={'calc(100% - 40px)'}>
                                <Text truncate='end'>{command ? command : path}</Text>
                            </Accordion.Control>
                            <ActionIcon
                                mr={8}
                                size="sm"
                                sx={{
                                    color: 'var(--vscode-menu-foreground)',
                                    '&:hover': {
                                        backgroundColor: 'var(--vscode-toolbar-activeBackground)'
                                    }
                                }}
                                onClick={() => {
                                    input.removeContext(index);
                                }}>
                                <IconX size="1rem" />
                            </ActionIcon>
                        </Box>
                        <Accordion.Panel>
                            <ScrollArea type="auto">
                                {
                                    content
                                        ? <pre style={{ overflowWrap: 'normal', fontSize: 'var(--vscode-editor-font-size)', margin: 0 }}>{content}</pre>
                                        : <Center>
                                            <Text c='gray.3'>No content</Text>
                                        </Center>
                                }
                            </ScrollArea>
                        </Accordion.Panel>
                    </Accordion.Item>
                );
            })
        }
    </Accordion>);
});

export default InputContexts;