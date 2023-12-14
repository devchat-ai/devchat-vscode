import * as React from 'react';
import {
    AppShell,
    useMantineTheme,
} from '@mantine/core';
import ChatPanel from '@/views/pages/ChatPanel';
import Head from '@/views/components/Header';
import './App.css';

export default function App() {
    const theme = useMantineTheme();
    return (
        <AppShell
            header={<Head />}
            styles={{
                main: {
                    padding:'40px 0 0 0',
                    fontFamily: 'var(--vscode-editor-font-family)',
                    fontSize: 'var(--vscode-editor-font-size)',
                },
            }}
        >
            <ChatPanel />
        </AppShell>
    );
}