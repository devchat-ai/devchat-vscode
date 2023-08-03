import * as React from 'react';
import { Button } from '@mantine/core';
import { IconPlayerStop } from '@tabler/icons-react';
import messageUtil from '@/util/MessageUtil';
import { useAppDispatch } from '@/views/hooks';

import {
    stopGenerating,
} from '@/views/reducers/chatSlice';

const StopButton = () => {
    const dispatch = useAppDispatch();
    return (
        <Button
            size='xs'
            leftIcon={<IconPlayerStop color='var(--vscode-button-foreground)' />}
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
            onClick={() => {
                dispatch(stopGenerating({ hasDone: false, message: null }));
                messageUtil.sendMessage({
                    command: 'stopDevChat'
                });
            }}
            variant="white">
            Stop generating
        </Button>);
};

export default StopButton;