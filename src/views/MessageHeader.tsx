import React from "react";
import { Text, Flex, Avatar, ActionIcon, Tooltip, CopyButton } from "@mantine/core";

// @ts-ignore
import SvgAvatarDevChat from '@/views/avatar_devchat.svg';
// @ts-ignore
import SvgAvatarUser from '@/views/avatar_spaceman.png';
import { IconCheck, IconCopy, Icon360 } from "@tabler/icons-react";

import { useAppDispatch } from '@/views/hooks';

import {
    setContexts,
    setValue,
} from './inputSlice';

const MessageHeader = (props: any) => {
    const { type, message, contexts } = props;
    const dispatch = useAppDispatch();
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
            ? <Tooltip sx={{ padding: '3px', fontSize: 'var(--vscode-editor-font-size)' }} label={done ? 'Refilled' : 'Refill prompt'} withArrow position="left" color="gray">
                <ActionIcon size='sm' style={{ marginLeft: 'auto' }}
                    onClick={() => {
                        dispatch(setValue(message));
                        dispatch(setContexts(contexts));
                        setDone(true);
                        setTimeout(() => { setDone(false); }, 2000);
                    }}>
                    {done ? <IconCheck size="1rem" /> : <Icon360 size="1.125rem" />}
                </ActionIcon>
            </Tooltip>
            : <CopyButton value={message} timeout={2000}>
                {({ copied, copy }) => (
                    <Tooltip sx={{ padding: '3px', fontSize: 'var(--vscode-editor-font-size)' }} label={copied ? 'Copied' : 'Copy message'} withArrow position="left" color="gray">
                        <ActionIcon size='xs' color={copied ? 'teal' : 'gray'} onClick={copy} style={{ marginLeft: 'auto' }}>
                            {copied ? <IconCheck size="1rem" /> : <IconCopy size="1rem" />}
                        </ActionIcon>
                    </Tooltip>
                )}
            </CopyButton>
        }
    </Flex >);
};

export default MessageHeader;