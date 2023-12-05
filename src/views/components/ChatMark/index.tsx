import React, { useEffect, useState } from 'react';
import { Box, Button, Checkbox, Text, Radio, Textarea, createStyles } from '@mantine/core';
import { useListState, useSetState } from '@mantine/hooks';
import { useMst } from '@/views/stores/RootStore';
import { type } from 'os';
import { debug } from 'console';

const useStyles = createStyles((theme) => ({
    container:{
        padding:0,
        margin:0,
    },
    submit:{
        marginTop:theme.spacing.xs,
        marginRight:theme.spacing.xs,
        marginBottom:theme.spacing.xs,
    },
    cancel:{
    },
    button:{
        marginTop:theme.spacing.xs,
        marginRight:theme.spacing.xs,
        marginBottom:theme.spacing.xs,
    },
    checkbox:{
        marginTop:theme.spacing.xs,
        marginBottom:theme.spacing.xs,
    },
    label:{
        color:'var(--vscode-editor-foreground)',
    },
    radio:{
        marginTop:theme.spacing.xs,
        marginBottom:theme.spacing.xs,
    },
    editor:{
        backgroundColor: 'var(--vscode-input-background)',
        borderColor: 'var(--vscode-input-border)',
        color: 'var(--vscode-input-foreground)',
    },
    editorWrapper:{
        marginTop:theme.spacing.xs,
        marginBottom:theme.spacing.xs,
    }
  }));

interface Wdiget{
    id:string,
    value:string,
    title?:string,
    type:'editor'|'checkbox'|'radio'|'button'|'text'
}
  
const ChatMark = ({ children, ...props }) => {
    const {classes} = useStyles();
    const [checkboxValues, setCheckboxValues] = useSetState({});
    const [radioValues, setRadioValues] = useSetState({});
    const [editorValues, setEditorValues] = useSetState({});
    const [widgets,widgetsHandlers] = useListState<Wdiget>();
    const {chat} = useMst();
    
    const handleSubmit = () => {
        let formData = {
            ...editorValues
        };
        for(let key in checkboxValues){
            if(checkboxValues[key]==='checked'){
                formData[key] = checkboxValues[key];
            }
        }
        for(let key in radioValues){
            if(radioValues[key]==='checked'){
                formData[key] = radioValues[key];
            }
        }
        chat.userInput(formData);
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

    useEffect(()=>{

        const lines = children.split('\n');
        let editorContentTemp = '';

        lines.forEach((line, index) => {

            if (!line.startsWith('>')) { // Text widget
                widgetsHandlers.append({
                    id:`text${index}`,
                    type:'text',
                    value:line,
                });
            } else if (line.startsWith('> (')) { // Button widget
                let match = line.match(/\((.*?)\)\s(.*)/);
                if (match) {
                    const [id, title] = match.slice(1);
                    widgetsHandlers.append({
                        id,
                        title,
                        type:'button',
                        value:title,
                    });
                }
            } else if (line.startsWith('> [')) { // Checkbox widget
                let match = line.match(/\[([x ]*)\]\((.*?)\):\s*(.*)/);
                if (match) {
                    const [status, id, title] = match.slice(1);
                    widgetsHandlers.append({
                        id,
                        title,
                        type:'checkbox',
                        value:status === 'x'?'checked':'unchecked',
                    });
                }
            } else if (line.startsWith('> - (')) { // Radio button widget
                let match = line.match(/-\s\((.*?)\):\s(.*)/);
                if (match) {
                    const [id, title] = match.slice(1);
                    widgetsHandlers.append({
                        id,
                        title,
                        type:'radio',
                        value:'unchecked',
                    });
                }
            } else if (line.startsWith('>')) { // Editor widget
                // Collecting editor lines
                editorContentTemp += line.substring(2) + '\n';
                // if next line is not editor, then end current editor
                const nextLine = index + 1 < lines.length? lines[index + 1]:null;
                if (!nextLine || !nextLine.startsWith('>')) {
                    const id = `editor${Object.keys(editorValues).length}`;
                    widgetsHandlers.append({
                        id,
                        type:'editor',
                        value:editorContentTemp,
                    });
                    editorContentTemp = '';
                }
            }
        });

    },[]);

    // Render markdown widgets
    const renderWidgets = (widgets) => {
        let radioGroupTemp:any = []; 
        let wdigetsTemp:any = [];
        widgets.map((widget, index) => {
            if (widget.type === 'text') {
                wdigetsTemp.push(<Text key={index}>{widget.value}</Text>);
            } else if (widget.type === 'button') {
                const id = widget.id;
                wdigetsTemp.push(<Button 
                        className={classes.button} 
                        key={id} size='xs' 
                        onClick={event => handleButtonClick({id,event})}>
                            {widget.title}
                        </Button>);
            } else if (widget.type === 'checkbox') {
                const id = widget.id;
                wdigetsTemp.push(<Checkbox 
                        classNames={{root:classes.checkbox,label:classes.label}} 
                        key={id} 
                        label={widget.title} 
                        checked={widget.value==='checked'} 
                        size='xs'  
                        onChange={event => handleCheckboxChange({id,event})}/>);
            } else if (widget.type === 'radio') {
                const id = widget.id;
                radioGroupTemp.push(<Radio 
                        classNames={{root:classes.radio,label:classes.label}} 
                        key={radioValues[id]} 
                        value={id} 
                        label={widget.title} 
                        size='xs' 
                        onChange={event => handleRadioChange({id,event})}/>);
                // if next widget is not radio, then end current group
                const nextWidget = index + 1 < widgets.length? widgets[index + 1]:null;
                if (!nextWidget || nextWidget.type !== 'radio') {
                    const radioGroup = <Radio.Group key={`group-${index}`}>{radioGroupTemp}</Radio.Group>;
                    radioGroupTemp = [];
                    wdigetsTemp.push(radioGroup);
                }
            } else if (widget.type === 'editor') {
                const id = widget.id;
                wdigetsTemp.push(<Textarea 
                        classNames={{wrapper:classes.editorWrapper,input:classes.editor}} 
                        key={id} 
                        defaultValue={widget.value} 
                        rows={10} 
                        onChange={event => handleEditorChange({id,event})}/>);
            }
        });
        return wdigetsTemp;
    };

    return (
        <Box className={classes.container}>
            {props.type==='form'
                ?<form>
                    {renderWidgets(widgets)}
                    <Button className={classes.submit}  size='xs' onClick={handleSubmit}>Submit</Button>
                    <Button className={classes.cancel}  size='xs' onClick={handleCancel}>Cancel</Button>
                </form>
                :renderWidgets(widgets)
            }
        </Box>
    );
};

export default ChatMark;
