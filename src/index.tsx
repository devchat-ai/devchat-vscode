import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { MantineProvider, MantineThemeOverride } from '@mantine/core';
import { Provider, rootStore } from '@/views/stores/RootStore';
import App from '@/views/App';

const container = document.getElementById('app')!;
const root = createRoot(container); // createRoot(container!) if you use TypeScript
const myTheme: MantineThemeOverride = {
    fontFamily: 'var(--vscode-editor-font-family)',
    colors: {
        "merico":[
            "#F9F5F4",
            "#EADAD6",
            "#E1C0B6",
            "#DEA594",
            "#E1886F",
            "#ED6A45",
            "#D75E3C",
            "#BD573B",
            "#9F5541",
            "#865143",
          ],
    },
    primaryColor: 'merico',
};
  

root.render(
    <MantineProvider withGlobalStyles withNormalizeCSS withCSSVariables 
    theme={myTheme}>
        <Provider value={rootStore}>
            <App />
        </Provider>
    </MantineProvider>
);
