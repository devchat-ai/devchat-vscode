
import { Stack, Container, Divider } from "@mantine/core";
import React from "react";
import MessageBody from "@/views/components/MessageBody";
import MessageAvatar from "@/views/components/MessageAvatar";
import { observer } from "mobx-react-lite";
import { useMst } from "@/views/stores/RootStore";
import MessageContext from "@/views/components/MessageContext";


const MessageList = observer((props: any) => {
    const { width } = props;
    const { chat } = useMst();

    return (<>
        {chat.messages.map((item, index: number) => {
            const { message: messageText, type: messageType, contexts } = item;
            // setMessage(messageText);
            return <Stack
                spacing={0}
                key={`message-${index}`}
                sx={{
                    width: width,
                    padding: 0,
                    margin: 0,
                }}>
                <MessageAvatar
                    key={`message-header-${index}`}
                    showDelete={index === chat.messages.length - 2}
                    item={item} />
                <Container
                    key={`message-container-${index}`}
                    sx={{
                        margin: 0,
                        padding: 0,
                        width: width,
                        pre: {
                            whiteSpace: 'break-spaces'
                        },
                    }}>
                    <MessageContext key={`message-context-${index}`} contexts={contexts} />
                    <MessageBody key={`message-codeblock-${index}`} messageType={messageType} messageText={messageText} />
                </Container >
                {index !== chat.messages.length - 1 && <Divider my={3} key={`message-divider-${index}`} />}
            </Stack >;
        })}
    </>);
});

export default MessageList;