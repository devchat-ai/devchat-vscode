
import * as React from 'react';
import { Button } from '@mantine/core';
import { IconRotateDot } from '@tabler/icons-react';
import { useAppDispatch } from '@/views/hooks';

import {
    reGenerating,
} from '@/views/chatSlice';

const RegenerationButton = () => {
    const dispatch = useAppDispatch();
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
        onClick={() => dispatch(reGenerating())}
        variant="white" >
        Regeneration
    </Button >);
};

export default RegenerationButton;