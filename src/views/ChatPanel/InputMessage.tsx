import { useMantineTheme, Flex, Stack, Accordion, Box, ActionIcon, ScrollArea, Center, Popover, Textarea, Text, Divider } from "@mantine/core";
import { useListState, useResizeObserver } from "@mantine/hooks";
import { IconGitBranch, IconBook, IconX, IconSquareRoundedPlus, IconSend } from "@tabler/icons-react";
import React, { useState, useEffect } from "react";
import { IconGitBranchChecked, IconShellCommand, IconMouseRightClick } from "./Icons";
import messageUtil from '../../util/MessageUtil';


import { useSelector, useDispatch } from 'react-redux';
import {
    setValue,
    selectValue,
    selectContexts,
    selectMenuOpend,
    selectMenuType,
    selectCurrentMenuIndex,
    setCurrentMenuIndex,
    removeContext,
    clearContexts,
    newContext,
    openMenu,
    closeMenu,
} from './inputSlice';
import {
    selectGenerating,
    newMessage,
    startGenerating,
} from './chatSlice';

const InputContexts = () => {
    const dispatch = useDispatch();
    const contexts = useSelector(selectContexts);
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
                    <Accordion.Item value={`item-${index}`} >
                        <Box sx={{
                            display: 'flex', alignItems: 'center',
                            backgroundColor: 'var(--vscode-menu-background)',
                        }}>
                            <Accordion.Control w={'calc(100% - 40px)'}>
                                {'command' in context ? context.command : context.path}
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

const InputMessage = (props: any) => {
    const { width } = props;

    const dispatch = useDispatch();
    const input = useSelector(selectValue);
    const generating = useSelector(selectGenerating);
    const contexts = useSelector(selectContexts);
    const menuOpend = useSelector(selectMenuOpend);
    const menuType = useSelector(selectMenuType);
    const currentMenuIndex = useSelector(selectCurrentMenuIndex);
    const theme = useMantineTheme();
    const [commandMenus, commandMenusHandlers] = useListState<{ pattern: string; description: string; name: string }>([]);
    const [contextMenus, contextMenusHandlers] = useListState<{ pattern: string; description: string; name: string }>([]);
    const [commandMenusNode, setCommandMenusNode] = useState<any>(null);
    const [inputRef, inputRect] = useResizeObserver();

    const handlePlusClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        dispatch(openMenu('contexts'));
        inputRef.current.focus();
        event.stopPropagation();
    };

    const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = event.target.value;
        // if value start with '/' command show menu
        if (value.startsWith('/')) {
            dispatch(openMenu('commands'));
            dispatch(setCurrentMenuIndex(0));
        } else {
            dispatch(closeMenu());
        }
        dispatch(setValue(value));
    };

    const handleSendClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        if (input) {
            // Process and send the message to the extension
            const contextStrs = contexts.map((item: any, index: number) => {
                const { file, context } = item;
                return `[context|${file}]`;
            });
            const text = input + contextStrs.join(' ');
            // Add the user's message to the chat UI
            dispatch(newMessage({ type: 'user', message: input, contexts: contexts ? [...contexts].map((item) => ({ ...item })) : undefined }));
            // start generating
            dispatch(startGenerating(text));
            // Clear the input field
            dispatch(setValue(''));
            dispatch(clearContexts());
        }
    };

    const handleContextClick = (contextName: string) => {
        // Process and send the message to the extension
        messageUtil.sendMessage({
            command: 'addContext',
            selected: contextName
        });
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (menuOpend) {
            if (event.key === 'Escape') {
                dispatch(closeMenu());
            }
            if (menuType === 'commands') {
                if (event.key === 'ArrowDown') {
                    const newIndex = currentMenuIndex + 1;
                    dispatch(setCurrentMenuIndex(newIndex < commandMenusNode.length ? newIndex : 0));
                    event.preventDefault();
                }
                if (event.key === 'ArrowUp') {
                    const newIndex = currentMenuIndex - 1;
                    dispatch(setCurrentMenuIndex(newIndex < 0 ? commandMenusNode.length - 1 : newIndex));
                    event.preventDefault();
                }
                if (event.key === 'Enter' && !event.shiftKey) {
                    const commandNode = commandMenusNode[currentMenuIndex];
                    dispatch(setValue(`/${commandNode.props['data-pattern']} `));
                    dispatch(closeMenu());
                    event.preventDefault();
                }
            }
        } else {
            if (event.key === 'Enter' && !event.shiftKey) {
                handleSendClick(event as any);
            }
        }
    };

    const contextMenuIcon = (name: string) => {
        if (name === 'git diff --cached') {
            return (<IconGitBranchChecked size={16}
                color='var(--vscode-menu-foreground)'
                style={{
                    marginTop: 8,
                    marginLeft: 12,
                }} />);
        }
        if (name === 'git diff HEAD') {
            return (<IconGitBranch size={16}
                color='var(--vscode-menu-foreground)'
                style={{
                    marginTop: 8,
                    marginLeft: 12,
                }} />);
        }
        return (<IconShellCommand size={16}
            color='var(--vscode-menu-foreground)'
            style={{
                marginTop: 8,
                marginLeft: 12,
            }} />);
    };


    const contextMenusNode = contextMenus
        .sort((a, b) => {
            if (a.name === '<custom command>') {
                return 1; // Placing '<custom command>' at the end
            } else if (b.name === '<custom command>') {
                return -1; // Placing '<custom command>' at the front
            } else {
                return (a.name || "").localeCompare(b.name || ""); // Sorting alphabetically for other cases
            }
        })
        .map(({ pattern, description, name }, index) => {
            return (
                <Flex
                    mih={40}
                    gap="md"
                    justify="flex-start"
                    align="flex-start"
                    direction="row"
                    wrap="wrap"
                    sx={{
                        padding: '5px 0',
                        '&:hover': {
                            cursor: 'pointer',
                            color: 'var(--vscode-commandCenter-activeForeground)',
                            backgroundColor: 'var(--vscode-commandCenter-activeBackground)'
                        }
                    }}
                    onClick={() => {
                        handleContextClick(name);
                        dispatch(closeMenu());
                    }}
                >
                    {contextMenuIcon(name)}
                    <Stack spacing={0}>
                        <Text sx={{
                            fontSize: 'sm',
                            fontWeight: 'bolder',
                            color: 'var(--vscode-menu-foreground)'
                        }}>
                            {name}
                        </Text>
                        <Text sx={{
                            fontSize: 'sm',
                            color: theme.colors.gray[6],
                        }}>
                            {description}
                        </Text>
                    </Stack>
                </Flex>);
        });

    const commandMenuIcon = (pattern: string) => {
        if (pattern === 'commit_message') {
            return (<IconBook size={16}
                color='var(--vscode-menu-foreground)'
                style={{
                    marginTop: 8,
                    marginLeft: 12,
                }} />);
        }
        return (<IconShellCommand size={16}
            color='var(--vscode-menu-foreground)'
            style={{
                marginTop: 8,
                marginLeft: 12,
            }} />);
    };

    useEffect(() => {
        messageUtil.registerHandler('regCommandList', (message: { result: { pattern: string; description: string; name: string }[] }) => {
            commandMenusHandlers.append(...message.result);
        });
        messageUtil.registerHandler('regContextList', (message: { result: { pattern: string; description: string; name: string }[] }) => {
            contextMenusHandlers.append(...message.result);
        });
        messageUtil.registerHandler('appendContext', (message: { command: string; context: string }) => {
            // context is a temp file path
            const match = /\|([^]+?)\]/.exec(message.context);
            // Process and send the message to the extension
            messageUtil.sendMessage({
                command: 'contextDetail',
                file: match && match[1],
            });
        });
        messageUtil.registerHandler('contextDetailResponse', (message: { command: string; file: string; result: string }) => {
            //result is a content json 
            // 1. diff json structure
            // {
            // 	languageId: languageId,
            // 	path: fileSelected,
            // 	content: codeSelected
            // };
            // 2. command json structure
            // {
            //     command: commandString,
            //     content: stdout
            // };
            const context = JSON.parse(message.result);
            if (typeof context !== 'undefined' && context) {
                dispatch(newContext({
                    file: message.file,
                    context: context,
                }));
            }
        });
        inputRef.current.focus();
    }, []);

    useEffect(() => {
        let filtered = commandMenus;
        if (input) {
            filtered = commandMenus.filter((item) => `/${item.pattern}`.startsWith(input));
        }
        const node = filtered.map(({ pattern, description, name }, index) => {
            return (
                <Flex
                    mih={40}
                    gap="md"
                    justify="flex-start"
                    align="flex-start"
                    direction="row"
                    wrap="wrap"
                    sx={{
                        padding: '5px 0',
                        '&:hover,&[aria-checked=true]': {
                            cursor: 'pointer',
                            color: 'var(--vscode-commandCenter-activeForeground)',
                            backgroundColor: 'var(--vscode-commandCenter-activeBackground)'
                        }
                    }}
                    onClick={() => {
                        dispatch(setValue(`/${pattern} `));
                        dispatch(closeMenu());
                    }}
                    aria-checked={index === currentMenuIndex}
                    data-pattern={pattern}
                >
                    {commandMenuIcon(pattern)}
                    <Stack spacing={0}>
                        <Text sx={{
                            fontSize: 'sm',
                            fontWeight: 'bolder',
                            color: 'var(--vscode-menu-foreground)'
                        }}>
                            /{pattern}
                        </Text>
                        <Text sx={{
                            fontSize: 'sm',
                            color: theme.colors.gray[6],
                        }}>
                            {description}
                        </Text>
                    </Stack>
                </Flex>);
        });
        setCommandMenusNode(node);
        if (node.length === 0) {
            dispatch(closeMenu());
        }
    }, [input, commandMenus, currentMenuIndex]);

    return (
        <>
            {contexts && contexts.length > 0 &&
                <InputContexts />
            }
            <Popover
                id='commandMenu'
                position='top-start'
                closeOnClickOutside={true}
                shadow="sm"
                width={width}
                opened={menuOpend}
                onChange={() => {
                    dispatch(closeMenu());
                    inputRef.current.focus();
                }}
                onClose={() => dispatch(closeMenu())}
                onOpen={() => menuType !== '' ? dispatch(openMenu(menuType)) : dispatch(closeMenu())}
                returnFocus={true}>
                <Popover.Target>
                    <Textarea
                        id='chat-textarea'
                        disabled={generating}
                        value={input}
                        ref={inputRef}
                        onKeyDown={handleKeyDown}
                        onChange={handleInputChange}
                        autosize
                        minRows={1}
                        maxRows={10}
                        radius="md"
                        size="xs"
                        sx={{ pointerEvents: 'all' }}
                        placeholder="Send a message."
                        styles={{
                            icon: { alignItems: 'center', paddingLeft: '5px' },
                            rightSection: { alignItems: 'center', paddingRight: '5px' },
                            input: {
                                fontSize: 'var(--vscode-editor-font-size)',
                                backgroundColor: 'var(--vscode-input-background)',
                                borderColor: 'var(--vscode-input-border)',
                                color: 'var(--vscode-input-foreground)',
                                '&[data-disabled]': {
                                    color: 'var(--vscode-disabledForeground)'
                                }
                            }
                        }}
                        icon={
                            <ActionIcon
                                size='sm'
                                disabled={generating}
                                onClick={handlePlusClick}
                                sx={{
                                    pointerEvents: 'all',
                                    '&:hover': {
                                        backgroundColor: 'var(--vscode-toolbar-activeBackground)'
                                    },
                                    '&[data-disabled]': {
                                        borderColor: 'var(--vscode-input-border)',
                                        backgroundColor: 'var(--vscode-toolbar-activeBackground)'
                                    }
                                }}
                            >
                                <IconSquareRoundedPlus size="1rem" />
                            </ActionIcon>
                        }
                        rightSection={
                            <ActionIcon
                                size='sm'
                                disabled={generating}
                                onClick={handleSendClick}
                                sx={{
                                    pointerEvents: 'all',
                                    '&:hover': {
                                        backgroundColor: 'var(--vscode-toolbar-activeBackground)'
                                    },
                                    '&[data-disabled]': {
                                        borderColor: 'var(--vscode-input-border)',
                                        backgroundColor: 'var(--vscode-toolbar-activeBackground)'
                                    }
                                }}
                            >
                                <IconSend size="1rem" />
                            </ActionIcon>
                        }
                    />
                </Popover.Target>
                {
                    menuType === 'contexts'
                        ? (<Popover.Dropdown
                            sx={{
                                padding: 0,
                                color: 'var(--vscode-menu-foreground)',
                                borderColor: 'var(--vscode-menu-border)',
                                backgroundColor: 'var(--vscode-menu-background)'
                            }}>
                            <Flex
                                gap="3px"
                                justify="flex-start"
                                align="center"
                                direction="row"
                                wrap="wrap"
                                sx={{ overflow: 'hidden' }}
                            >
                                <IconMouseRightClick
                                    size={14}
                                    color={'var(--vscode-menu-foreground)'}
                                    style={{ marginLeft: '12px' }} />
                                <Text
                                    c="dimmed"
                                    ta="left"
                                    fz='sm'
                                    m='12px 5px'
                                    truncate='end'
                                    w={width - 60}>
                                    Tips: Select code or file & right click
                                </Text>
                            </Flex>
                            <Divider />
                            <Text sx={{ padding: '5px 5px 5px 10px' }}>DevChat Contexts</Text>
                            {contextMenusNode}
                        </Popover.Dropdown>)
                        : menuType === 'commands' && commandMenusNode.length > 0
                            ? <Popover.Dropdown
                                sx={{
                                    padding: 0,
                                    color: 'var(--vscode-menu-foreground)',
                                    borderColor: 'var(--vscode-menu-border)',
                                    backgroundColor: 'var(--vscode-menu-background)'
                                }}>
                                <Text sx={{ padding: '5px 5px 5px 10px' }}>DevChat Commands</Text>
                                {commandMenusNode}
                            </Popover.Dropdown>
                            : <></>
                }
            </Popover>
        </>);
};

export default InputMessage;