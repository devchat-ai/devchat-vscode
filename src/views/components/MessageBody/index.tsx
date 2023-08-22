import { Container } from "@mantine/core";
import React from "react";
import { observer } from "mobx-react-lite";
import MessageMarkdown from "@/views/components/MessageMarkdown";

interface IProps {
    messageText: string,
    messageType: string
}

const MessageBody = observer((props: IProps) => {
    const { messageText, messageType } = props;
    return (
        messageType === 'bot'
            ? <MessageMarkdown messageText={messageText} />
            : <Container
                sx={{
                    margin: 0,
                    padding: 0,
                    pre: {
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                    },
                }}>
                <pre>{messageText}</pre>
            </Container>
    );
});

export default MessageBody;