
import * as React from 'react';
import { Button } from '@mantine/core';
import { IconRotateDot } from '@tabler/icons-react';
import { observer } from "mobx-react-lite";
import { useMst } from "@/views/stores/RootStore";


const RegenerationButton = observer(() => {
    const { chat } = useMst();
    return (<Button
        size='xs'
        leftIcon={<IconRotateDot color='var(--vscode-button-foreground)' />}
        sx={{
            backgroundColor: 'var(--vscode-button-background)',
        }}
        styles={{
            icon: {
                color: 'var(--vscode-button-foreground)'
            },
            label: {
                color: 'var(--vscode-button-foreground)',
                fontSize: 'var(--vscode-editor-font-size)',
            }
        }}
        onClick={() => chat.reGenerating()}
        variant="white" >
        Regeneration
    </Button >);
});

export default RegenerationButton;