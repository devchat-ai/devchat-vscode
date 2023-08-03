import * as React from 'react';
import ReactDOM from 'react-dom';
import { createRoot } from 'react-dom/client';
import { MantineProvider } from '@mantine/core';
import { Provider } from 'react-redux';
import App from '@/views/App';
import { store } from '@/views/reducers/store';

const container = document.getElementById('app')!;
const root = createRoot(container); // createRoot(container!) if you use TypeScript
root.render(
    <MantineProvider withGlobalStyles withNormalizeCSS>
        <Provider store={store}>
            <App />
        </Provider>
    </MantineProvider>
);
