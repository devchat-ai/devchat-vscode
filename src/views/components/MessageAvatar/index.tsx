import React from "react";
import { Text, Flex, Avatar, ActionIcon, Tooltip, CopyButton, SimpleGrid } from "@mantine/core";

// @ts-ignore
import SvgAvatarDevChat from './avatar_devchat.svg';
// @ts-ignore
import SvgAvatarUser from './avatar_spaceman.png';
import { IconCheck, IconCopy, Icon360, IconEdit, IconTrash } from "@tabler/icons-react";
import { observer } from "mobx-react-lite";
import { useMst } from "@/views/stores/RootStore";

import { IMessage } from "@/views/stores/ChatStore";

interface IProps {
    item: IMessage,
    showEdit?: boolean,
    showDelete: boolean
}

const MessageAvatar = observer((props: IProps) => {
    const { item, showEdit = false, showDelete = true } = props;
    const { contexts, message, type, hash } = item;
    const { input, chat } = useMst();
    const [done, setDone] = React.useState(false);
    return (<Flex
        m='10px 0 10px 0'
        gap="sm"
        justify="flex-start"
        align="center"
        direction="row"
        wrap="wrap">
        {
            type === 'bot'
                ? <Avatar
                    color="indigo"
                    size={25}
                    radius="xl"
                    src={SvgAvatarDevChat} />
                : <Avatar
                    color="cyan"
                    size={25}
                    radius="xl"
                    src={SvgAvatarUser} />
        }
        <Text weight='bold'>{type === 'bot' ? 'DevChat' : 'User'}</Text>
        {type === 'user'
            ? <Flex
                gap="xs"
                justify="flex-end"
                align="center"
                direction="row"
                wrap="wrap"
                style={{ marginLeft: 'auto', marginRight: '10px' }}>
                <Tooltip sx={{ padding: '3px', fontSize: 'var(--vscode-editor-font-size)' }} label={done ? 'Refilled' : 'Refill prompt'} withArrow position="left" color="gray">
                    <ActionIcon size='sm'
                        onClick={() => {
                            input.setValue(message);
                            input.setContexts(contexts);
                            setDone(true);
                            setTimeout(() => { setDone(false); }, 2000);
                        }}>
                        {done ? <IconCheck size="1rem" /> : <Icon360 size="1.125rem" />}
                    </ActionIcon>
                </Tooltip>
                {showEdit && <Tooltip sx={{ padding: '3px', fontSize: 'var(--vscode-editor-font-size)' }} label="Edit message" withArrow position="left" color="gray">
                    <ActionIcon size='sm'
                        onClick={() => {

                        }}>
                        <IconEdit size="1.125rem" />
                    </ActionIcon>
                </Tooltip >}
                {showDelete && hash !== 'message' && <Tooltip sx={{ padding: '3px', fontSize: 'var(--vscode-editor-font-size)' }} label="Delete message" withArrow position="left" color="gray">
                    <ActionIcon size='sm'
                        onClick={() => {
                            if (item.hash) {
                                chat.deleteMessage(item).then();
                            } else {
                                chat.popMessage();
                                chat.popMessage();
                            }
                        }}>
                        <IconTrash size="1.125rem" />
                    </ActionIcon>
                </Tooltip >}
            </Flex >
            : <CopyButton value={message} timeout={2000}>
                {({ copied, copy }) => (
                    <Tooltip sx={{ padding: '3px', fontSize: 'var(--vscode-editor-font-size)' }} label={copied ? 'Copied' : 'Copy message'} withArrow position="left" color="gray">
                        <ActionIcon size='xs' color={copied ? 'teal' : 'gray'} onClick={copy} style={{ marginLeft: 'auto', marginRight: '10px' }}>
                            {copied ? <IconCheck size="1rem" /> : <IconCopy size="1rem" />}
                        </ActionIcon>
                    </Tooltip>
                )}
            </CopyButton>
        }
    </Flex >);
});

export default MessageAvatar;