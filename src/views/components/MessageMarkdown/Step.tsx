import { Accordion, Box, Button, Collapse, Group,Loader,Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import React from "react";
import SyntaxHighlighter from "react-syntax-highlighter";
import LanguageCorner from "./LanguageCorner";
import { okaidia } from "react-syntax-highlighter/dist/esm/styles/prism";
import { IconCheck, IconChevronDown, IconFileDiff, IconLoader } from "@tabler/icons-react";
import { observer } from "mobx-react-lite";
import { useMst } from "@/views/stores/RootStore";
import { keyframes,css } from "@emotion/react";

interface StepProps {
    language: string;
    children: string;
}

const Step:  React.FC<StepProps> = observer((props) => {
  const { chat } = useMst();
  const {language,children} = props;
  const [opened, { toggle }] = useDisclosure(false);

  // extract first line with # as button label
  const lines = children.split('\n');
  const title = lines.length>0&&lines[0].indexOf('#')>=0?lines[0].split('#')[1]:'';
  const done = lines[lines.length-1].trim()==='# Done';
  const contents = lines.slice(1,lines.length-1);

  const spin = keyframes`
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  `;

  return <>
      {lines.length > 1 &&<Accordion 
          variant="contained"
          chevronPosition="right"
          sx={{
              marginTop: 5,
              borderRadius: 5,
              backgroundColor: 'var(--vscode-menu-background)',
          }}
          styles={{
              item: {
                  borderColor: 'var(--vscode-menu-border)',
                  backgroundColor: 'var(--vscode-menu-background)',
                  '&[data-active]': {
                      backgroundColor: 'var(--vscode-menu-background)',
                  }
              },
              control: {
                  height: 30,
                  borderRadius: 3,
                  backgroundColor: 'var(--vscode-menu-background)',
                  '&[aria-expanded="true"]': {
                      borderBottomLeftRadius: 0,
                      borderBottomRightRadius: 0,
                  },
                  '&:hover': {
                      backgroundColor: 'var(--vscode-menu-background)',
                  },
                  paddingLeft: '0.5rem',
                  paddingRight: '0.5rem',
                  fontFamily: 'var(--vscode-editor-font-familyy)',
                  fontSize: 'var(--vscode-editor-font-size)',
              },
              chevron: {
                  color: 'var(--vscode-menu-foreground)',
              },
              icon: {
                  color: 'var(--vscode-menu-foreground)',
              },
              label: {
                  color: 'var(--vscode-menu-foreground)',
              },
              panel: {
                  color: 'var(--vscode-menu-foreground)',
                  backgroundColor: 'var(--vscode-menu-background)',
              },
              content: {
                  borderRadius: 3,
                  backgroundColor: 'var(--vscode-menu-background)',
                  padding:'0.5rem'
              }
          }}
        >
          <Accordion.Item value={title} mah='200'>
              <Accordion.Control icon={
                  done
                  ?<IconCheck size="1.125rem"/>
                  :<Loader size="xs" color="#ED6A45" speed={1} />
                }
              >
                <Text truncate='end' w={chat.chatPanelWidth-100}>{title}</Text>  
              </Accordion.Control>
              <Accordion.Panel>
                <SyntaxHighlighter {...props}
                    language="markdown"
                    style={okaidia}
                    PreTag="div">
                    {children}
                </SyntaxHighlighter>
              </Accordion.Panel>
          </Accordion.Item>
      </Accordion>}
    </>;
  });

  export default Step;