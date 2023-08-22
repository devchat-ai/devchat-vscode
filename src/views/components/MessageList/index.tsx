
import { Stack, Container, Divider } from "@mantine/core";
import React, { useEffect } from "react";
import MessageBody from "@/views/components/MessageBody";
import MessageAvatar from "@/views/components/MessageAvatar";
import { observer } from "mobx-react-lite";
import { useMst } from "@/views/stores/RootStore";
import { Message } from "@/views/stores/ChatStore";
import MessageContext from "@/views/components/MessageContext";


const MessageList = observer((props: any) => {
    const { width } = props;
    const { chat } = useMst();

    useEffect(() => {
        chat.addMessages([
            Message.create({
                type: 'user',
                message: "How do I use DevChat?"
            }),
            Message.create({
                type: 'bot',
                message: `
Do you want to write some code or have a question about the project? Simply right-click on your chosen files or code snippets and add them to DevChat. Feel free to ask me anything or let me help you with coding.

Don't forget to check out the "+" button on the left of the input to add more context. To see a list of workflows you can run in the context, just type "/". Happy prompting!
                `}),
        ])
    }, []);

    return (<>
        {chat.messages.map((item, index: number) => {
            const { message: messageText, type: messageType, hash: messageHash, contexts } = item;
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
                    deleteHash={messageHash}
                    avatarType={messageType}
                    copyMessage={messageText}
                    messageContexts={contexts} />
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