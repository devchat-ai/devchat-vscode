import * as React from 'react';
import { useState } from 'react';
import { Avatar, Container, Divider, Flex, Grid, Stack, TypographyStylesProvider } from '@mantine/core';
import { Input, Tooltip } from '@mantine/core';
import { List } from '@mantine/core';
import { ScrollArea } from '@mantine/core';
import { createStyles } from '@mantine/core';
import { ActionIcon } from '@mantine/core';
import { Menu, Button, Text } from '@mantine/core';
import { useViewportSize } from '@mantine/hooks';
import { IconEdit, IconRobot, IconSend, IconSquareRoundedPlus, IconUser } from '@tabler/icons-react';
import { IconSettings, IconSearch, IconPhoto, IconMessageCircle, IconTrash, IconArrowsLeftRight } from '@tabler/icons-react';
import { Prism } from '@mantine/prism';
import { useRemark } from 'react-remark';

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
        marginTop: 8,
        marginLeft: 0,
        marginRight: 0,
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
}));

const chatPanel = () => {

    const [reactContent, setMarkdownSource] = useRemark();
    const [opened, setOpened] = useState(false);
    const [commandOpened, setCommandOpened] = useState(false);
    const { classes } = useStyles();
    const { height, width } = useViewportSize();

    const demoCode = `import { Button } from '@mantine/core';
    function Demo() {
    return <Button>Hello</Button>
    }`;

    setMarkdownSource(`# code block
    print '3 backticks or'
    print 'indent 4 spaces'`);

    const handlePlusBottonClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setOpened(!opened);
        event.stopPropagation();
    };
    const handleContainerClick = (event: React.MouseEvent<HTMLDivElement>) => {
        if (opened) { setOpened(false); }
    };
    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value
        // if value start with '/' command show menu
        if (value.startsWith('/')) {
            setCommandOpened(true);
        } else {
            setCommandOpened(false);
        }
    }

    return (
        <Container className={classes.panel} onClick={handleContainerClick}>
            <ScrollArea h={height - 70} type="never">
                <Flex
                    mih={50}
                    gap="md"
                    justify="flex-start"
                    align="flex-start"
                    direction="row"
                    wrap="wrap"
                    className={classes.messageBody}
                >
                    <Avatar color="indigo" size='md' radius="xl" className={classes.avatar}>
                        <IconUser size="1.5rem" />
                    </Avatar>
                    <Container className={classes.responseContent}>
                        <Text>
                            Write a hello world, and explain it.
                        </Text>
                    </Container>
                    {/* <ActionIcon>
                        <IconEdit size="1.5rem" />
                    </ActionIcon> */}
                </Flex>
                <Divider my="sm" label="Mar 4, 2023" labelPosition="center" />
                <Flex
                    mih={50}
                    gap="md"
                    justify="flex-start"
                    align="flex-start"
                    direction="row"
                    wrap="wrap"
                    className={classes.messageBody}
                >
                    <Avatar color="blue" size='md' radius="xl" className={classes.avatar}>
                        <IconRobot size="1.5rem" />
                    </Avatar>
                    <Container className={classes.responseContent}>
                        {reactContent}
                    </Container>
                </Flex>
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
                    <ActionIcon className={classes.icon} onClick={handlePlusBottonClick}>
                        <IconSquareRoundedPlus size="1rem" />
                    </ActionIcon>
                }
                rightSection={
                    <ActionIcon>
                        <IconSend size="1rem" />
                    </ActionIcon>
                }
                onChange={handleInputChange}
            />
        </Container>
    );
};

export default chatPanel;