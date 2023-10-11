
import { Stack, Container, Divider, Box, Group,Text, Button, createStyles } from "@mantine/core";
import React, { useEffect } from "react";
import MessageBody from "@/views/components/MessageBody";
import MessageAvatar from "@/views/components/MessageAvatar";
import { observer } from "mobx-react-lite";
import { useMst } from "@/views/stores/RootStore";
import { Message } from "@/views/stores/ChatStore";
import MessageContext from "@/views/components/MessageContext";
import CurrentMessage from "@/views/components/CurrentMessage";
import { Card } from '@mantine/core';
import { IconInfoSquareRounded } from "@tabler/icons-react";

const useStyles = createStyles((theme) => ({
    card:{
        backgroundColor: 'var(--vscode-menu-background)',
        fontFamily: 'var(--vscode-editor-font-familyy)',
        fontSize: 'var(--vscode-editor-font-size)',
        color: 'var(--vscode-menu-foreground)',
        borderColor: 'var(--vscode-menu-border)',
    },
    cardDescription:{
        marginTop: 10,
        marginBottom: 10,
    },
    button:{
        backgroundColor:"#ED6A45",
        color:"#fff",
        "&:hover":{
            backgroundColor:"#ED6A45",
            opacity: 0.8,
        },
        "&:focus":{
            backgroundColor:"#ED6A45",
            opacity: 0.8,
        }
    }
  }));

const MessageList = observer((props: any) => {
    const { chat } = useMst();
    const {classes} = useStyles();

    return (<Stack spacing={0} sx={{margin:'0 10px 10px 10px'}}>
        {chat.messages.map((item, index: number) => {
            const { message: messageText, type: messageType, hash: messageHash, contexts, confirm } = item;
            // setMessage(messageText);
            return <Stack
                spacing={0}
                key={`message-${index}`}
                sx={{
                    padding: 0,
                    margin: 0
                }}>
                <MessageAvatar
                    key={`message-header-${index}`}
                    showDelete={index === chat.messages.length - 2}
                    deleteHash={messageHash}
                    avatarType={messageType}
                    copyMessage={messageText}
                    messageContexts={contexts} />
                <Box
                    key={`message-container-${index}`}
                    sx={{
                        margin: 0,
                        padding: 0,
                        pre: {
                            whiteSpace: 'break-spaces'
                        },
                    }}>
                    { messageType === 'bot' && confirm && <Card shadow="sm" padding="xs" radius="md" withBorder className={classes.card}>
                        <Card.Section withBorder inheritPadding py="xs">
                            <Group position="left">
                                <IconInfoSquareRounded size={20} />
                                <Text fw={500}>Additional Cost Required</Text>
                            </Group>
                        </Card.Section>
                        <Text className={classes.cardDescription}>Will you pay approximately $1.2 - $ 2.2 for this task?</Text>
                        <Group position="right" >
                            <Button size="xs" color="#ED6A45" className={classes.button} onClick={()=> chat.sendLastUserMessage() }>Yes</Button>
                            <Button size="xs" color="#ED6A45" className={classes.button} onClick={()=> chat.cancelDevchatAsk()}>No</Button>
                        </Group>
                    </Card>}
                    <MessageContext key={`message-context-${index}`} contexts={contexts} />
                    <MessageBody key={`message-codeblock-${index}`} messageType={messageType} >
                        {messageText}
                    </MessageBody>
                </Box >
                {index !== chat.messages.length - 1 && <Divider my={3} key={`message-divider-${index}`} />}
            </Stack >;
        })}
        <CurrentMessage />
    </Stack>);
});

export default MessageList;