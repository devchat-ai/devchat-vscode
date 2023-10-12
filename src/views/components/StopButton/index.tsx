import * as React from 'react';
import { Button } from '@mantine/core';
import { IconPlayerStop } from '@tabler/icons-react';
import messageUtil from '@/util/MessageUtil';
import { observer } from "mobx-react-lite";
import { useMst } from "@/views/stores/RootStore";


const StopButton = observer(() => {
    const { chat } = useMst();
    return (
        <Button
            size="xs" 
            sx={{
                backgroundColor:"#ED6A45",
                fontFamily: 'var(--vscode-editor-font-familyy)',
                fontSize: 'var(--vscode-editor-font-size)',
                color:"#fff",
                "&:hover":{
                    backgroundColor:"#ED6A45",
                    opacity: 0.8,
                },
                "&:focus":{
                    backgroundColor:"#ED6A45",
                    opacity: 0.8,
                }
            }}
            styles={{
                icon: {
                    color:"#fff",
                },
                label: {
                    fontSize: 'var(--vscode-editor-font-size)',
                    color:"#fff",
                }
            }}
            leftIcon={<IconPlayerStop color='var(--vscode-button-foreground)' />}
            onClick={() => {
                chat.stopGenerating(false, '', chat.currentMessage);
                messageUtil.sendMessage({
                    command: 'stopDevChat'
                });
            }}
            variant="white">
            Stop generating
        </Button>);
});

export default StopButton;