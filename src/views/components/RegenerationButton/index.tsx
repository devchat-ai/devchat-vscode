
import * as React from 'react';
import { Button } from '@mantine/core';
import { IconRotateDot } from '@tabler/icons-react';
import { observer } from "mobx-react-lite";
import { useMst } from "@/views/stores/RootStore";


const RegenerationButton = observer(() => {
    const { chat } = useMst();
    return (<Button
        size='xs'
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
        leftIcon={<IconRotateDot color='var(--vscode-button-foreground)' />}
        onClick={() => chat.reGenerating()}
        variant="white" >
        Regeneration
    </Button >);
});

export default RegenerationButton;