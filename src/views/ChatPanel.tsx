import * as React from 'react';
import { useState, useEffect } from 'react';
import { Avatar, Center, Container, Divider, Flex, Grid, Stack, TypographyStylesProvider } from '@mantine/core';
import { Input, Tooltip } from '@mantine/core';
import { List } from '@mantine/core';
import { ScrollArea } from '@mantine/core';
import { createStyles, keyframes } from '@mantine/core';
import { ActionIcon } from '@mantine/core';
import { Menu, Button, Text } from '@mantine/core';
import { useListState, useViewportSize } from '@mantine/hooks';
import { IconEdit, IconRobot, IconSend, IconSquareRoundedPlus, IconUser } from '@tabler/icons-react';
import { IconSettings, IconSearch, IconPhoto, IconMessageCircle, IconTrash, IconArrowsLeftRight } from '@tabler/icons-react';
import { Prism } from '@mantine/prism';
import { useRemark, Remark } from 'react-remark';
import messageUtil from '../util/MessageUtil';


const blink = keyframes({
    '50%': { opacity: 0 },
});

const useStyles = createStyles((theme, _params, classNames) => ({
    panel: {
        height: '100%',
        backgroundColor: theme.colors.gray[0],
    },
    plusMenu: {
        top: 'unset !important',
        left: '31px !important',
        bottom: 60,
    },
    commandMenu: {
        top: 'unset !important',
        left: '31px !important',
        bottom: 60,
    },
    commandText: {
        fontSize: '1.0rem',
        fontWeight: 'bolder',
    },
    commandDesc: {
        fontSize: '0.8rem',
        color: theme.colors.gray[6],
    },
    responseContent: {
        marginTop: 0,
        marginLeft: 0,
        marginRight: 0,
        paddingLeft: 0,
        paddingRight: 0,
        width: 'calc(100% - 62px)',
    },
    icon: {
        pointerEvents: 'all',
    },
    avatar: {
        marginTop: 8,
        marginLeft: 8,
    },
    messageBody: {
    },
    cursor: {
        animation: `${blink} 0.5s infinite;`
    }
}));

const chatPanel = () => {

    const [messages, handlers] = useListState<{ type: string; message: string; }>([]);
    const [showCursor, setShowCursor] = useState(false);
    const [registed, setRegisted] = useState(false);
    const [opened, setOpened] = useState(false);
    // const [markdown, setMarkdown] = useRemark();
    // const [message, setMessage] = useState('');
    const [input, setInput] = useState('');
    const [commandOpened, setCommandOpened] = useState(false);
    const { classes } = useStyles();
    const { height, width } = useViewportSize();

    const handlePlusClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setOpened(!opened);
        event.stopPropagation();
    };
    const handleContainerClick = (event: React.MouseEvent<HTMLDivElement>) => {
        if (opened) { setOpened(false); }
    };
    const handleSendClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        if (input) {
            // Add the user's message to the chat UI
            handlers.append({ type: 'user', message: input });

            // Clear the input field
            setInput('');
            setShowCursor(true);

            // Process and send the message to the extension
            messageUtil.sendMessage({
                command: 'sendMessage',
                text: input
            });
        }
    };

    useEffect(() => {
        if (registed) return;
        // Add the received message to the chat UI as a bot message
        messageUtil.registerHandler('receiveMessage', (message: { text: string; }) => {
            console.log(`receiveMessage: ${message.text}`);
            handlers.append({ type: 'bot', message: message.text });
            setRegisted(true);
        });
    }, [registed]);

    // useEffect(() => {
    //     let current = 0;
    //     const interval = setInterval(() => {
    //         if (current >= message.length) {
    //             clearInterval(interval);
    //             setShowCursor(false);
    //             return;
    //         }
    //         setMarkdown(message.slice(0, current + 1));
    //         current++;
    //     }, 25);
    //     return () => clearInterval(interval);
    // }, [message]);

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;
        // if value start with '/' command show menu
        if (value.startsWith('/')) {
            setCommandOpened(true);
        } else {
            setCommandOpened(false);
        }
        setInput(value);
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            handleSendClick(event as any);
        }
    };

    const defaultMessages = (<Center>
        <Text size="lg" color="gray" weight={500}>No messages yet</Text>
    </Center>);

    const messageList = messages.map(({ message: messageText, type: messageType }, index) => {
        // setMessage(messageText);
        return (<>
            <Flex
                mih={50}
                gap="md"
                justify="flex-start"
                align="flex-start"
                direction="row"
                wrap="wrap"
                className={classes.messageBody}
            >
                {
                    messageType === 'bot'
                        ? <Avatar color="indigo" size='md' radius="xl" className={classes.avatar}><IconRobot size="1.5rem" /></Avatar>
                        : <Avatar color="cyan" size='md' radius="xl" className={classes.avatar}><IconUser size="1.5rem" /></Avatar>
                }

                <Container className={classes.responseContent}>
                    <Remark>{messageText}</Remark>
                    {/* {markdown}{showCursor && <span className={classes.cursor}>|</span>} */}
                </Container>
            </Flex>
            {index !== messages.length - 1 && <Divider my="sm" />}
        </>);
    });

    return (
        <Container className={classes.panel} onClick={handleContainerClick}>
            <ScrollArea h={height - 70} type="never">
                {messageList.length > 0 ? messageList : defaultMessages}
            </ScrollArea>
            <Menu id='plusMenu' shadow="md" width={200} opened={opened} onChange={setOpened} >
                <Menu.Dropdown className={classes.plusMenu}>
                    <Menu.Label>Application</Menu.Label>
                    <Menu.Item icon={<IconSettings size={14} />}>Settings</Menu.Item>
                    <Menu.Item icon={<IconMessageCircle size={14} />}>Messages</Menu.Item>
                    <Menu.Item icon={<IconPhoto size={14} />}>Gallery</Menu.Item>
                    <Menu.Item
                        icon={<IconSearch size={14} />}
                        rightSection={<Text size="xs" color="dimmed">⌘K</Text>}
                    >
                        Search
                    </Menu.Item>

                    <Menu.Divider />

                    <Menu.Label>Danger zone</Menu.Label>
                    <Menu.Item icon={<IconArrowsLeftRight size={14} />}>Transfer my data</Menu.Item>
                    <Menu.Item color="red" icon={<IconTrash size={14} />}>Delete my account</Menu.Item>
                </Menu.Dropdown>
            </Menu>
            <Menu id='commandMenu' shadow="md" width={500} opened={commandOpened} onChange={setCommandOpened} >
                <Menu.Dropdown className={classes.commandMenu}>
                    <Menu.Label>Context Commands</Menu.Label>
                    <Menu.Item>
                        <Text className={classes.commandText}>
                            /ref
                        </Text>
                        <Text className={classes.commandDesc}>
                            Run a local CLI and add its output to the context (e.g., pytest .).
                        </Text>
                    </Menu.Item>
                    <Menu.Item>
                        <Text className={classes.commandText}>
                            /local
                        </Text>
                        <Text className={classes.commandDesc}>
                            Bypass AI and run a local CLI to check its output (e.g., git status).
                        </Text>
                    </Menu.Item>

                    <Menu.Divider />

                    <Menu.Label>DevChat Bots</Menu.Label>

                    <Menu.Item>
                        <Text className={classes.commandText}>
                            /code
                        </Text>
                        <Text className={classes.commandDesc}>
                            Generate or update code.
                        </Text>
                    </Menu.Item>
                    <Menu.Item>
                        <Text className={classes.commandText}>
                            /commit_message
                        </Text>
                        <Text className={classes.commandDesc}>
                            Write a commit message.
                        </Text>
                    </Menu.Item>
                    <Menu.Item>
                        <Text className={classes.commandText}>
                            /doc
                        </Text>
                        <Text className={classes.commandDesc}>
                            Write a doc for reference, wiki, or discussion.
                        </Text>
                    </Menu.Item>
                </Menu.Dropdown>
            </Menu>
            <Input
                multiline={true}
                radius="md"
                placeholder="Send a message."
                icon={
                    <ActionIcon className={classes.icon} onClick={handlePlusClick}>
                        <IconSquareRoundedPlus size="1rem" />
                    </ActionIcon>
                }
                rightSection={
                    <ActionIcon onClick={handleSendClick}>
                        <IconSend size="1rem" />
                    </ActionIcon>
                }
                value={input}
                onKeyDown={handleKeyDown}
                onChange={handleInputChange}
            />
        </Container>
    );
};

export default chatPanel;