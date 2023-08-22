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
import { IChatContext } from "@/views/stores/InputStore";

interface IProps {
    item?: IMessage,
    avatarType?: "user" | "bot" | "system",
    copyMessage?: string,
    messageContexts?: IChatContext[],
    deleteHash?: string,
    showEdit?: boolean,
    showDelete?: boolean
}

const MessageAvatar = observer((props: IProps) => {
    const {
        messageContexts = [],
        copyMessage = "",
        deleteHash = undefined,
        avatarType = "user",
        showEdit = false,
        showDelete = false
    } = props;
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
            avatarType === 'bot'
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
        <Text weight='bold'>{avatarType === 'bot' ? 'DevChat' : 'User'}</Text>
        {avatarType === 'user'
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
                            input.setValue(copyMessage);
                            input.setContexts(messageContexts);
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
                {showDelete && deleteHash !== 'message' && <Tooltip sx={{ padding: '3px', fontSize: 'var(--vscode-editor-font-size)' }} label="Delete message" withArrow position="left" color="gray">
                    <ActionIcon size='sm'
                        onClick={() => {
                            if (deleteHash) {
                                chat.deleteMessage(deleteHash).then();
                            } else {
                                chat.popMessage();
                                chat.popMessage();
                            }
                        }}>
                        <IconTrash size="1.125rem" />
                    </ActionIcon>
                </Tooltip >}
            </Flex >
            : <CopyButton value={copyMessage} timeout={2000}>
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