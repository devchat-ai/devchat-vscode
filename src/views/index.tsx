import * as React from 'react';
import ReactDOM from 'react-dom';
import { MantineProvider } from '@mantine/core';
import App from './App';

ReactDOM.render(
    <MantineProvider withGlobalStyles withNormalizeCSS>
        <App />
    </MantineProvider>,
    document.getElementById('app'));