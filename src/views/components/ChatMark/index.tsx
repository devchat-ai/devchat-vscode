import React from 'react';
import { Button, Checkbox, Radio, Textarea } from '@mantine/core';

const ChatMark = ({ children }) => {
    const renderWidgets = (markdown) => {
        const lines = markdown.split('\n');
        let editorContent = '';
        const widgets:any = [];

        lines.forEach((line, index) => {
            let match;

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
                match = line.match(/-\s\((.*?)\)\s(.*)/);
                if (match) {
                    const [id, title] = match.slice(1);
                    widgets.push(<Radio key={id} value={id} label={title} />);
                }
            } else if (line.startsWith('>')) {
                // Collecting editor lines
                editorContent += line.substring(1) + '\n';
            } else if (editorContent) {
                // Add the accumulated editor content as a widget
                widgets.push(<Textarea key={widgets.length} defaultValue={editorContent.trimEnd()} />);
                editorContent = ''; // Reset for next block
            }
        });

        // Check for remaining editor content
        if (editorContent) {
            widgets.push(<Textarea key={widgets.length} defaultValue={editorContent.trimEnd()} />);
        }

        return widgets;
    };

    return (
        <div>
            {renderWidgets(children)}
        </div>
    );
};

export default ChatMark;
