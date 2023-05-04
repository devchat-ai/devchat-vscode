import * as React from 'react';
import { useState } from 'react';
import { Container } from '@mantine/core';
import { Input, Tooltip } from '@mantine/core';
import { List } from '@mantine/core';
import { ScrollArea } from '@mantine/core';
import { createStyles } from '@mantine/core';
import { ActionIcon } from '@mantine/core';
import { Menu, Button, Text } from '@mantine/core';
import { useViewportSize } from '@mantine/hooks';
import { IconSend, IconSquareRoundedPlus } from '@tabler/icons-react';
import { IconSettings, IconSearch, IconPhoto, IconMessageCircle, IconTrash, IconArrowsLeftRight } from '@tabler/icons-react';

const useStyles = createStyles((theme, _params, classNames) => ({
    panel: {
        height: '100%',
        backgroundColor: theme.colors.gray[0],
    },
    menu: {
        top: 'unset !important',
        left: '31px !important',
        bottom: 60,
    },
    icon: {
        pointerEvents: 'all',
    },
}));

const chatPanel = () => {

    const [opened, setOpened] = useState(false);
    const { classes } = useStyles();
    const { height, width } = useViewportSize();

    const handlePlusBottonClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setOpened(!opened);
        event.stopPropagation();
    };
    const handleContainerClick = (event: React.MouseEvent<HTMLDivElement>) => {
        if (opened) { setOpened(false); }
    };

    return (
        <Container className={classes.panel} onClick={handleContainerClick}>
            <ScrollArea h={height - 70} type="never">
                <List>
                    <List.Item>Clone or download repository from GitHub</List.Item>
                    <List.Item>Install dependencies with yarn</List.Item>
                    <List.Item>To start development server run npm start command</List.Item>
                    <List.Item>Run tests to make sure your changes do not break the build</List.Item>
                    <List.Item>Submit a pull request once you are done</List.Item>
                </List>
            </ScrollArea>
            <Menu shadow="md" width={200} opened={opened} onChange={setOpened} >
                <Menu.Dropdown className={classes.menu}>
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
            />
        </Container>
    );
};

export default chatPanel;