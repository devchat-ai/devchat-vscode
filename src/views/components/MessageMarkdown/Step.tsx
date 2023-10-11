import { Box, Button, Collapse, Group } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import React from "react";
import SyntaxHighlighter from "react-syntax-highlighter";
import LanguageCorner from "./LanguageCorner";
import { okaidia } from "react-syntax-highlighter/dist/esm/styles/prism";

interface StepProps {
    language: string;
    children: string;
  }
const Step:  React.FC<StepProps> = (props) => {
    const {language,children} = props;
    const [opened, { toggle }] = useDisclosure(false);
  
    return (
      <Box maw={400} mx="auto">
        <Group mb={5}>
          <Button onClick={toggle}>Toggle content</Button>
        </Group>
  
        <Collapse in={opened}>
            <div style={{ position: 'relative' }}>
                <LanguageCorner language={language} />
                <SyntaxHighlighter {...props}
                    language={language}
                    customStyle={{ padding: '3em 1em 1em 2em' }}
                    style={okaidia}
                    PreTag="div">
                    {children}
                </SyntaxHighlighter>
            </div >
        </Collapse>
      </Box>
    );
  };

  export default Step;