import * as React from 'react';
import {
    AppShell,
    useMantineTheme,
} from '@mantine/core';
import ChatPanel from '@/views/ChatPanel';

export default function App() {
    const theme = useMantineTheme();
    return (
        <AppShell
            styles={{
                main: {
                    padding: 0,
                    fontFamily: 'var(--vscode-editor-font-familyy)',
                    fontSize: 'var(--vscode-editor-font-size)',
                },
            }}
        >
            <ChatPanel />
        </AppShell>
    );
}