import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { MantineProvider } from '@mantine/core';
import { Provider, rootStore } from '@/views/stores/RootStore';
import App from '@/views/App';

const container = document.getElementById('app')!;
const root = createRoot(container); // createRoot(container!) if you use TypeScript
root.render(
    <MantineProvider withGlobalStyles withNormalizeCSS>
        <Provider value={rootStore}>
            <App />
        </Provider>
    </MantineProvider>
);
