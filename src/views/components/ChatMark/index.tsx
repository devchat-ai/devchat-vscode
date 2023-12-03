import React, { useState } from 'react';
import { Box, Button, Checkbox, Text, Radio, Textarea, createStyles } from '@mantine/core';
import { useListState, useSetState } from '@mantine/hooks';

const useStyles = createStyles((theme) => ({
    container:{
        padding:0,
        margin:0,
    },
    button:{
        marginTop:theme.spacing.xs,
        marginRight:theme.spacing.xs,
    },
    checkbox:{
        marginTop:theme.spacing.xs,
    },
    label:{
        color:'var(--vscode-editor-foreground)',
    },
    radio:{
        marginTop:theme.spacing.xs,
    },
    editor:{
        backgroundColor: 'var(--vscode-input-background)',
        borderColor: 'var(--vscode-input-border)',
        color: 'var(--vscode-input-foreground)',
    },
    editorWrapper:{
        marginTop:theme.spacing.xs,
    }
  }));
  
const ChatMark = ({ children }) => {
    const {classes} = useStyles();
    const [checkboxValues, setCheckboxValues] = useSetState({});
    const [radioValues, setRadioValues] = useSetState({});
    
    const handleButtonClick = ({id,event}) => {
        console.log(id);
    };
    
    const handleCheckboxChange = ({id,event})=>{
        setCheckboxValues({[id]:event.currentTarget.checked});
    };
    const handleRadioChange = ({id,event})=>{
        setRadioValues({[id]:event.currentTarget.checked});
    };

    // Render markdown widgets
    const renderWidgets = (markdown) => {
        const lines = markdown.split('\n');
        let editorContent = '';
        const widgets:any = [];
        let radioGroup:any = []; 

        lines.forEach((line, index) => {
            let match;

            if (!line.startsWith('>')) {
                widgets.push(<Text key={index}>{line}</Text>);
                return;
            }

            if (line.startsWith('> (')) {
                // Button widget
                match = line.match(/\((.*?)\)\s(.*)/);
                if (match) {
                    const [id, title] = match.slice(1);
                    widgets.push(<Button className={classes.button} key={id} size='xs' onClick={event => handleButtonClick({id,event})}>{title}</Button>);
                }
            } else if (line.startsWith('> [')) {
                // Checkbox widget
                match = line.match(/\[([x ]*)\]\((.*?)\):\s*(.*)/);
                if (match) {
                    const [status, id, title] = match.slice(1);
                    if(!(id in checkboxValues)){
                        setCheckboxValues({[id]:status === 'x'});
                    }
                    widgets.push(<Checkbox classNames={{root:classes.checkbox,label:classes.label}} key={id} label={title} checked={checkboxValues[id]} size='xs'  onChange={event => handleCheckboxChange({id,event})}/>);
                }
            } else if (line.startsWith('> -')) {
                // Radio button widget
                match = line.match(/-\s\((.*?)\):\s(.*)/);
                if (match) {
                    const [id, title] = match.slice(1);
                    radioGroup.push(<Radio classNames={{root:classes.radio,label:classes.label}} key={radioValues[id]} value={id} label={title} size='xs' onChange={event => handleRadioChange({id,event})}/>);

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
                widgets.push(<Textarea classNames={{wrapper:classes.editorWrapper,input:classes.editor}} key={widgets.length} defaultValue={editorContent.trimEnd()} />);
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
            widgets.push(<Textarea classNames={{wrapper:classes.editorWrapper,input:classes.editor}} key={widgets.length} defaultValue={editorContent.trimEnd()} />);
        }

        return widgets;
    };

    return (
        <Box className={classes.container}>
            {renderWidgets(children)}
        </Box>
    );
};

export default ChatMark;
