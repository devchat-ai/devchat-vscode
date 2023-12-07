import { Container, createStyles ,Text} from "@mantine/core";
import React from "react";
import { observer } from "mobx-react-lite";
import MessageMarkdown from "@/views/components/MessageMarkdown";
import { useMst } from "@/views/stores/RootStore";

interface IProps {
    messageType: string,
    children: string,
    temp?: boolean
}


const useStyles = createStyles((theme, options:any) => ({
    bodyWidth:{
        width: options.chatPanelWidth - 20,
    },
    userContent:{
        fontFamily: theme.fontFamily,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
    }
}));

const MessageBody = observer((props: IProps) => {
    const { children, messageType, temp=false } = props;
    const { chat } = useMst();
    const {classes} = useStyles({
        chatPanelWidth:chat.chatPanelWidth
    });
    return (
        messageType === 'bot'
            ? <MessageMarkdown className={classes.bodyWidth} temp={temp}>
                {children}
            </MessageMarkdown>
            : <Container
                sx={{
                    margin: 0,
                    padding: 0,
                    width: chat.chatPanelWidth - 20
                }}>
                <pre className={classes.userContent}>{children}</pre>
            </Container>
    );
});

export default MessageBody;