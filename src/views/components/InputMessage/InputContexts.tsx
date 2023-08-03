import { Accordion, Box, ActionIcon, ScrollArea, Center, Text } from "@mantine/core";
import { IconX } from "@tabler/icons-react";
import React from "react";
import { useAppDispatch, useAppSelector } from '@/views/hooks';

import {
    selectContexts,
    removeContext,
} from '@/views/inputSlice';

const InputContexts = () => {
    const dispatch = useAppDispatch();
    const contexts = useAppSelector(selectContexts);
    return (<Accordion variant="contained" chevronPosition="left"
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
            contexts.map((item: any, index: number) => {
                const { context } = item;
                return (
                    <Accordion.Item key={`item-${index}`} value={`item-value-${index}`} >
                        <Box sx={{
                            display: 'flex', alignItems: 'center',
                            backgroundColor: 'var(--vscode-menu-background)',
                        }}>
                            <Accordion.Control w={'calc(100% - 40px)'}>
                                <Text truncate='end'>{'command' in context ? context.command : context.path}</Text>
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
                                    dispatch(removeContext(index));
                                }}>
                                <IconX size="1rem" />
                            </ActionIcon>
                        </Box>
                        <Accordion.Panel mah={300}>
                            <ScrollArea h={300} type="never">
                                {
                                    context.content
                                        ? <pre style={{ overflowWrap: 'normal' }}>{context.content}</pre>
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
};

export default InputContexts;