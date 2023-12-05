import React, { useState } from 'react';
import { Box, Button, Checkbox, Text, Radio, Textarea, createStyles } from '@mantine/core';
import { useListState, useSetState } from '@mantine/hooks';
import { useMst } from '@/views/stores/RootStore';

const useStyles = createStyles((theme) => ({
    container:{
        padding:0,
        margin:0,
    },
    submit:{
        marginTop:theme.spacing.xs,
        marginRight:theme.spacing.xs,
    },
    cancel:{
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
  
const ChatMark = ({ children, ...props }) => {
    const {classes} = useStyles();
    const [checkboxValues, setCheckboxValues] = useSetState({});
    const [radioValues, setRadioValues] = useSetState({});
    const [editorValues, setEditorValues] = useSetState({});
    const {chat} = useMst();
    
    const handleSubmit = () => {
        chat.userInput({
            ...checkboxValues,
            ...radioValues,
            ...editorValues
        });
    };

    const handleCancel = () => {
        chat.userInput({
            'form':'cancel'
        });
    };

    const handleButtonClick = ({id,event}) => {
        chat.userInput({
            [id]:'click'
        });
    };
    
    const handleCheckboxChange = ({id,event})=>{
        const value = event.currentTarget.checked?'checked':'unchecked';
        setCheckboxValues({[id]:value});
        if(props.type !== 'form'){
            chat.userInput({
                [id]:value
            });
        }
    };
    const handleRadioChange = ({id,event})=>{
        const value = event.currentTarget.checked?'checked':'unchecked';
        setRadioValues({[id]:value});
        if(props.type !== 'form'){
            chat.userInput({
                [id]:value
            });
        }
    };
    const handleEditorChange = ({id,event})=>{
        setEditorValues({[id]:event.currentTarget.value});
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
                    // if(checkboxValues[id] === undefined){
                    //     setCheckboxValues({[id]:status === 'x'?'checked':'unchecked'});
                    // }
                    widgets.push(<Checkbox classNames={{root:classes.checkbox,label:classes.label}} key={id} label={title} checked={checkboxValues[id]} size='xs'  onChange={event => handleCheckboxChange({id,event})}/>);
                }
            } else if (line.startsWith('> -')) {
                // Radio button widget
                match = line.match(/-\s\((.*?)\):\s(.*)/);
                if (match) {
                    const [id, title] = match.slice(1);
                    radioGroup.push(<Radio classNames={{root:classes.radio,label:classes.label}} key={radioValues[id]} value={id} label={title} size='xs' onChange={event => handleRadioChange({id,event})}/>);

                    // 检查下一行是否还是 Radio，如果不是则结束当前 Group
                    const nextLine = index + 1 < lines.length? lines[index + 1]:null;
                    if (!nextLine || !nextLine.startsWith('> -')) {
                        widgets.push(<Radio.Group key={`group-${index}`}>{radioGroup}</Radio.Group>);
                        radioGroup = []; // 重置为下一个可能的 Group
                    }
                }
            } else if (line.startsWith('>')) {
                // Collecting editor lines
                editorContent += line.substring(2) + '\n';
                // Check for remaining editor content
                const nextLine = index + 1 < lines.length? lines[index + 1]:null;
                if (!nextLine || !nextLine.startsWith('>')) {
                    const id = `editor${Object.keys(editorValues).length}`;
                    // setEditorValues({[id]:editorContent.trimEnd()});
                    widgets.push(<Textarea classNames={{wrapper:classes.editorWrapper,input:classes.editor}} key={widgets.length} defaultValue={editorContent.trimEnd()} rows={10} onChange={event => handleEditorChange({id,event})}/>);
                    editorContent = '';
                }
            } else {
              if (radioGroup.length > 0) {
                  widgets.push(<Radio.Group key={`group-${index}`}>{radioGroup}</Radio.Group>);
                  radioGroup = []; // 重置为下一个可能的 Group
              }
            }
        });

        return widgets;
    };

    return (
        <Box className={classes.container}>
            {props.type==='form'
                ?<form>
                    {renderWidgets(children)}
                    <Button className={classes.submit}  size='xs' onClick={handleSubmit}>Submit</Button>
                    <Button className={classes.cancel}  size='xs' onClick={handleCancel}>Cancel</Button>
                </form>
                :renderWidgets(children)
            }
        </Box>
    );
};

export default ChatMark;
