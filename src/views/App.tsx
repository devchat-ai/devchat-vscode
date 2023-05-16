import * as React from 'react';
import { useState } from 'react';
import {
    AppShell,
    Navbar,
    Header,
    Footer,
    Aside,
    Text,
    MediaQuery,
    Burger,
    useMantineTheme,
} from '@mantine/core';
import ChatPanel from './ChatPanel';

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