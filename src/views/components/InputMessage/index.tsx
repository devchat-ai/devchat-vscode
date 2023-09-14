import { useMantineTheme, Flex, Stack, ActionIcon, ScrollArea, Popover, Textarea, Text, Indicator, Drawer, Group, Button, Menu,createStyles } from "@mantine/core";
import { useDisclosure, useResizeObserver } from "@mantine/hooks";
import { IconGitBranch, IconSend, IconPaperclip, IconChevronDown, IconTextPlus, IconRobot } from "@tabler/icons-react";
import React, { useState, useEffect } from "react";
import { IconGitBranchChecked, IconShellCommand } from "@/views/components/ChatIcons";
import messageUtil from '@/util/MessageUtil';
import InputContexts from './InputContexts';
import { observer } from "mobx-react-lite";
import { useMst } from "@/views/stores/RootStore";
import { ChatContext } from "@/views/stores/InputStore";
import { Message } from "@/views/stores/ChatStore";

const useStyles = createStyles((theme) => ({
    actionIcon:{
        color: 'var(--vscode-dropdown-foreground)',
        borderColor:'var(--vscode-dropdown-border)',
        backgroundColor: 'var(--vscode-dropdown-background)',
        '&:hover':{
            color: 'var(--vscode-dropdown-foreground)',
            borderColor:'var(--vscode-dropdown-border)',
            backgroundColor: 'var(--vscode-dropdown-background)'
        },
        '&[data-disabled]': {
            borderColor: "transparent",
            backgroundColor: "#e9ecef",
            color: "#adb5bd",
            cursor: "not-allowed",
            backgroundImage: "none",
            pointervents: "none",
        }
    }
  }));

const InputMessage = observer((props: any) => {
    const {classes} = useStyles();
    const { input, chat } = useMst();
    const { contexts, menuOpend, menuType, currentMenuIndex, contextMenus, commandMenus,modelMenus } = input;
    const { generating } = chat;

    const [drawerOpened, { open: openDrawer, close: closeDrawer }] = useDisclosure(false);

    const theme = useMantineTheme();
    const [commandMenusNode, setCommandMenusNode] = useState<any>(null);
    const [inputRef, inputRect] = useResizeObserver();

    const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = event.target.value;
        // if value start with '/' command show menu
        if (value.startsWith('/')) {
            input.openMenu('commands');
            input.setCurrentMenuIndex(0);
        } else {
            input.closeMenu();
        }
        input.setValue(value);
    };

    const handleSendClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        const inputValue = input.value;
        if (inputValue) {
            if (inputValue.trim() === '/help') {
                chat.helpMessage();
                input.setValue('');
                event.preventDefault();
            } else{
                const text = inputValue;
                // Add the user's message to the chat UI
                const chatContexts = contexts ? [...contexts].map((item) => ({ ...item })) : undefined;
                const newMessage = Message.create({
                    type: 'user',
                    message: inputValue,
                    contexts: chatContexts
                });
                chat.newMessage(newMessage);
                // start generating
                chat.startGenerating(text, chatContexts);
                // Clear the input field
                input.setValue('');
                input.clearContexts();
                setTimeout(() => {
                    chat.goScrollBottom();
                }, 1000);
            }
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
                input.closeMenu();
            }
            if (menuType === 'commands') {
                if (event.key === 'ArrowDown') {
                    const newIndex = currentMenuIndex + 1;
                    input.setCurrentMenuIndex(newIndex < commandMenusNode.length ? newIndex : 0);
                    event.preventDefault();
                }
                if (event.key === 'ArrowUp') {
                    const newIndex = currentMenuIndex - 1;
                    input.setCurrentMenuIndex(newIndex < 0 ? commandMenusNode.length - 1 : newIndex);
                    event.preventDefault();
                }
                if ((event.key === 'Enter' || event.key === 'Tab') && !event.shiftKey) {
                    const commandNode = commandMenusNode[currentMenuIndex];
                    const commandPattern = commandNode.props['data-pattern'];
                    if (commandPattern === 'help') {
                        chat.helpMessage();
                        input.setValue('');
                    } else {
                        input.setValue(`/${commandPattern} `);
                    }
                    input.closeMenu();
                    event.preventDefault();
                }
            }
        } else {
            if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                handleSendClick(event as any);
            }
        }
    };

    const contextMenuIcon = (name: string) => {
        if (name === 'git diff --cached') {
            return <IconGitBranchChecked size={14} color='var(--vscode-menu-foreground)'/>;
        }
        if (name === 'git diff HEAD') {
            return <IconGitBranch size={14} color='var(--vscode-menu-foreground)'/>;
        }
        return <IconShellCommand size={14} color='var(--vscode-menu-foreground)'/>;
    };

    useEffect(() => {
        input.fetchContextMenus().then();
        input.fetchCommandMenus().then();
        input.fetchModelMenus().then();
        messageUtil.registerHandler('regCommandList', (message: { result: object[]}) => {
            input.updateCommands(message.result);
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
                const chatContext = ChatContext.create({
                    file: message.file,
                    path: context.path,
                    command: context.command,
                    content: context.content,
                });
                input.newContext(chatContext);
            }
        });
        inputRef.current.focus();
    }, []);

    const getModelShowName = (modelName:string)=>{
        const nameMap = {
            "gpt-3.5-turbo": "GPT-3.5",
            "gpt-3.5-turbo-16k": "GPT-3.5-16K",
            "gpt-4": "GPT-4",
            "claude-2": "CLAUDE-2"
        };
        if (modelName in nameMap){
            return nameMap[modelName];
        } else if(modelName.lastIndexOf('/') > -1){
            return modelName.substring(modelName.lastIndexOf('/')+1).toLocaleUpperCase();
        } else {
            return modelName.toUpperCase();
        }
    };

    useEffect(() => {
        let filtered;
        if (input.value) {
            filtered = commandMenus.filter((item) => `/${item.pattern}`.startsWith(input.value));
        } else {
            filtered = commandMenus;
        }
        const node = filtered.map(({ pattern, description, name }, index) => {
            return (
                <Flex
                    key={`command-menus-${index}`}
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
                        input.setValue(`/${pattern} `);
                        input.closeMenu();
                    }}
                    aria-checked={index === currentMenuIndex}
                    data-pattern={pattern}>
                    <Stack spacing={0}
                        sx={{
                            paddingLeft: 10,
                        }}>
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
            input.closeMenu();
        }
    }, [input.value, commandMenus, currentMenuIndex]);

    useEffect(() => {
        if (drawerOpened && (!contexts || contexts.length === 0)) {
            closeDrawer();
        }
    }, [contexts.length]);

    const changeModel = (value) =>{
        chat.changeChatModel(value);
        messageUtil.sendMessage({
            command: "updateSetting",
            key1: "devchat",
            key2: "defaultModel",
            value: value,
        });
    };

    const menuStyles = {
        arrow:{
            borderColor: 'var(--vscode-menu-border)',
        },
        dropdown:{
            borderColor: 'var(--vscode-menu-border)',
            backgroundColor: 'var(--vscode-menu-background)'
        },
        itemLabel:{
            color: 'var(--vscode-menu-foreground)'
        },
        item: {
            padding: 5,
            backgroundColor: 'var(--vscode-menu-background)',
            '&:hover,&[data-hovered=true]': {
                color: 'var(--vscode-commandCenter-activeForeground)',
                borderColor: 'var(--vscode-commandCenter-border)',
                backgroundColor: 'var(--vscode-commandCenter-activeBackground)'
            }
        }
    };

    const buttonStyles = {
        root: {
            color: 'var(--vscode-dropdown-foreground)',
            borderColor:'var(--vscode-dropdown-border)',
            backgroundColor: 'var(--vscode-dropdown-background)',
            '&:hover':{
                color: 'var(--vscode-dropdown-foreground)',
                borderColor:'var(--vscode-dropdown-border)',
                backgroundColor: 'var(--vscode-dropdown-background)'
            }
        }
    };

    return (
        <Stack 
            spacing={0} 
            sx={{
                padding:'0 5px'
            }}
        >
            <Group 
                spacing={5} 
                sx={{
                    marginTop: 5
                }}
            >
                <Menu 
                    width={chat.chatPanelWidth-10} 
                    position='bottom-start' 
                    shadow="sm" 
                    withArrow
                    styles={menuStyles}
                    disabled={contextMenus.length === 0}
                >
                    <Menu.Target>
                        <ActionIcon 
                            radius="xl" 
                            variant="default"
                            disabled={generating}
                            className={classes.actionIcon}
                        >
                            <IconTextPlus size="1rem" />
                        </ActionIcon>
                    </Menu.Target>
                    <Menu.Dropdown>
                        {[...contextMenus]
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
                                    <Menu.Item
                                        key={`contexts-menus-${index}`}
                                        icon={contextMenuIcon(name)}
                                        onClick={() => {
                                            handleContextClick(name);
                                        }}
                                    >
                                        {name}
                                        <Text sx={{fontSize: '9pt',color: theme.colors.gray[6],}}>
                                            {description}
                                        </Text>
                                    </Menu.Item>);
                            })}
                    </Menu.Dropdown>
                </Menu>
                <Menu 
                    position="bottom-start" 
                    withArrow 
                    shadow="md"
                    styles={menuStyles}
                    disabled={modelMenus.length === 0}
                >
                    <Menu.Target>
                        <Button 
                            disabled={generating} 
                            variant="default" 
                            size="xs" 
                            radius="xl" 
                            leftIcon={<IconRobot size="1rem" />}
                            styles={buttonStyles}
                        >
                            {getModelShowName(chat.chatModel)}
                        </Button>
                    </Menu.Target>
                    <Menu.Dropdown>
                        {modelMenus.map((modelName) => { 
                            return <Menu.Item onClick={() => changeModel(modelName)}>
                                {getModelShowName(modelName)}
                            </Menu.Item>;
                         })}
                    </Menu.Dropdown>
                </Menu>
            </Group>
            {contexts && contexts.length > 0 &&
                <Drawer
                    opened={drawerOpened}
                    onClose={closeDrawer}
                    position="bottom"
                    title="DevChat Contexts"
                    overlayProps={{ opacity: 0.5, blur: 4 }}
                    closeButtonProps={{ children: <IconChevronDown size="1rem" /> }}
                    styles={{
                        content: {
                            background: 'var(--vscode-sideBar-background)',
                            color: 'var(--vscode-editor-foreground)',
                        },
                        header: {
                            background: 'var(--vscode-sideBar-background)',
                            color: 'var(--vscode-editor-foreground)',
                        }
                    }}>
                    <InputContexts />
                </Drawer >
            }
            <Popover
                position='top-start'
                shadow="sm"
                width={chat.chatPanelWidth-10} 
                opened={menuOpend}
                onChange={() => {
                    input.closeMenu();
                    inputRef.current.focus();
                }}
            >
                <Popover.Target>
                    <Textarea
                        id='chat-textarea'
                        disabled={generating}
                        value={input.value}
                        ref={inputRef}
                        onKeyDown={handleKeyDown}
                        onChange={handleInputChange}
                        autosize
                        minRows={1}
                        maxRows={10}
                        radius="md"
                        size="xs"
                        sx={{ 
                            pointerEvents: 'all' ,
                            marginTop: 5,
                            marginBottom: 5
                        }}
                        placeholder="Ask DevChat a question or type ‘/’ for workflow"
                        styles={{
                            rightSection: { alignItems: 'flex-end', marginBottom:'6px', marginRight: (contexts.length > 0 ? '24px' : '10px') },
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
                        rightSection={
                            <>
                                {contexts.length > 0 &&
                                    <Indicator label={contexts.length} size={12}>
                                        <ActionIcon
                                            size='md'
                                            radius="md" 
                                            variant="default"
                                            disabled={generating}
                                            onClick={openDrawer}
                                            className={classes.actionIcon}
                                            sx={{
                                                pointerEvents: 'all',
                                                '&[data-disabled]': {
                                                    borderColor: 'var(--vscode-input-border)',
                                                    backgroundColor: 'var(--vscode-toolbar-activeBackground)'
                                                }
                                            }}>
                                            <IconPaperclip size="1rem" />
                                        </ActionIcon>
                                    </Indicator>
                                }
                                <ActionIcon
                                    size='md'
                                    radius="md" 
                                    variant="default"
                                    disabled={generating}
                                    onClick={handleSendClick}
                                    className={classes.actionIcon}
                                    sx={{
                                        marginLeft: '10px',
                                        pointerEvents: 'all',
                                        backgroundColor:'#ED6A45',
                                        border:'0',
                                        color:'#FFFFFF',
                                        '&:hover': {
                                            backgroundColor:'#ED6A45',
                                            color:'#FFFFFF',
                                            opacity:0.7
                                        }
                                    }}>
                                    <IconSend size="1rem" />
                                </ActionIcon>
                            </>
                        }
                    />
                </Popover.Target>
                <Popover.Dropdown
                    sx={{
                        padding: 0,
                        color: 'var(--vscode-menu-foreground)',
                        borderColor: 'var(--vscode-menu-border)',
                        backgroundColor: 'var(--vscode-menu-background)'
                    }}>
                    <Text sx={{ padding: '5px 5px 5px 10px' }}>DevChat Workflows</Text>
                    <ScrollArea.Autosize mah={240} type="always">
                        {commandMenusNode}
                    </ScrollArea.Autosize>
                </Popover.Dropdown>
            </Popover >
        </Stack>);
});

export default InputMessage;