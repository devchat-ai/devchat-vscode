import React from 'react';
import { Box, Button, Checkbox, Group, Radio, Textarea, createStyles } from '@mantine/core';

const useStyles = createStyles((theme) => ({
    chatmarkBox:{
        padding:0,
        margin:0,
    }
  }));
  
const ChatMark = ({ children }) => {
    const {classes} = useStyles();
    // Render markdown widgets
    const renderWidgets = (markdown) => {
        const lines = markdown.split('\n');
        let editorContent = '';
        const widgets:any = [];
        let radioGroup:any = []; 

        lines.forEach((line, index) => {
            let match;

            if (!line.startsWith('>')) {
                widgets.push(<p key={index}>{line}</p>);
                return;
            }

            if (line.startsWith('> (')) {
                // Button widget
                match = line.match(/\((.*?)\)\s(.*)/);
                if (match) {
                    const [id, title] = match.slice(1);
                    widgets.push(<Button key={id}>{title}</Button>);
                }
            } else if (line.startsWith('> [')) {
                // Checkbox widget
                match = line.match(/\[([x ]*)\]\((.*?)\):\s*(.*)/);
                if (match) {
                    const [status, id, title] = match.slice(1);
                    widgets.push(<Checkbox key={id} label={title} checked={status === 'x'} />);
                }
            } else if (line.startsWith('> -')) {
                // Radio button widget
                match = line.match(/-\s\((.*?)\):\s(.*)/);
                if (match) {
                    const [id, title] = match.slice(1);
                    radioGroup.push(<Radio key={id} value={id} label={title} />);

                    // 检查下一行是否还是 Radio，如果不是则结束当前 Group
                    const nextLine = lines[index + 1];
                    if (!nextLine || !nextLine.startsWith('> -')) {
                        widgets.push(<Radio.Group key={`group-${index}`}>{radioGroup}</Radio.Group>);
                        radioGroup = []; // 重置为下一个可能的 Group
                    }
                }
            } else if (line.startsWith('>')) {
                // Collecting editor lines
                editorContent += line.substring(1) + '\n';
            } else if (editorContent) {
                // Add the accumulated editor content as a widget
                widgets.push(<Textarea key={widgets.length} defaultValue={editorContent.trimEnd()} />);
                editorContent = ''; // Reset for next block
            } else {
              if (radioGroup.length > 0) {
                  widgets.push(<Radio.Group key={`group-${index}`}>{radioGroup}</Radio.Group>);
                  radioGroup = []; // 重置为下一个可能的 Group
              }
            }
        });

        // Check for remaining editor content
        if (editorContent) {
            widgets.push(<Textarea key={widgets.length} defaultValue={editorContent.trimEnd()} />);
        }

        return widgets;
    };

    return (
        <Box className={classes.chatmarkBox}>
            {renderWidgets(children)}
        </Box>
    );
};

export default ChatMark;
