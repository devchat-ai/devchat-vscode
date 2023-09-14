import { Container, createStyles } from "@mantine/core";
import React from "react";
import { observer } from "mobx-react-lite";
import MessageMarkdown from "@/views/components/MessageMarkdown";
import { useMst } from "@/views/stores/RootStore";

interface IProps {
    messageText: string,
    messageType: string
}


const useStyles = createStyles((theme, options:any) => ({
    bodyWidth:{
        width: options.chatPanelWidth - 20,
    }
}));

const MessageBody = observer((props: IProps) => {
    const { messageText, messageType } = props;
    const { chat } = useMst();
    const {classes} = useStyles({
        chatPanelWidth:chat.chatPanelWidth
    });
    return (
        messageType === 'bot'
            ? <MessageMarkdown className={classes.bodyWidth}>{messageText}</MessageMarkdown>
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