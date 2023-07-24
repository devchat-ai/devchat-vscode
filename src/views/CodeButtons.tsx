import { Tooltip, ActionIcon, CopyButton, Flex } from "@mantine/core";
import { IconCheck, IconGitCommit, IconFileDiff, IconColumnInsertRight, IconReplace, IconCopy } from "@tabler/icons-react";
import React, { useState } from "react";

import messageUtil from '@/util/MessageUtil';

const IconButton = ({ label, color = 'gray', onClick, children }) => (
    <Tooltip sx={{ padding: '3px', fontSize: 'var(--vscode-editor-font-size)' }} label={label} withArrow position="left" color="gray">
        <ActionIcon size='xs' color={color} onClick={onClick}>
            {children}
        </ActionIcon>
    </Tooltip>
);

const CommitButton = ({ code }) => {
    const [commited, setCommited] = useState(false);
    const handleClick = () => {
        messageUtil.sendMessage({
            command: 'doCommit',
            content: code
        });
        setCommited(true);
        setTimeout(() => { setCommited(false); }, 2000);
    };
    return (
        <IconButton label={commited ? 'Committing' : 'Commit'} color={commited ? 'teal' : 'gray'} onClick={handleClick}>
            {commited ? <IconCheck size="1rem" /> : <IconGitCommit size="1rem" />}
        </IconButton>
    );
};

const CodeCopyButton = ({ code }) => {
    return (
        <CopyButton value={code} timeout={2000}>
            {({ copied, copy }) => (
                <IconButton label={copied ? 'Copied' : 'Copy'} color={copied ? 'teal' : 'gray'} onClick={copy}>
                    {copied ? <IconCheck size="1rem" /> : <IconCopy size="1rem" />}
                </IconButton>
            )}
        </CopyButton>
    );
};

const DiffButton = ({ code }) => {
    const handleClick = () => {
        messageUtil.sendMessage({
            command: 'show_diff',
            content: code
        });
    };
    return (
        <IconButton label='View Diff' onClick={handleClick}>
            <IconFileDiff size="1.125rem" />
        </IconButton>
    );
};

const CodeApplyButton = ({ code }) => {
    const handleClick = () => {
        messageUtil.sendMessage({
            command: 'code_apply',
            content: code
        });
    };
    return (
        <IconButton label='Insert Code' onClick={handleClick}>
            <IconColumnInsertRight size="1.125rem" />
        </IconButton>
    );
};

const FileApplyButton = ({ code }) => {
    const handleClick = () => {
        messageUtil.sendMessage({
            command: 'code_file_apply',
            content: code
        });
    };
    return (
        <IconButton label='Replace File' onClick={handleClick}>
            <IconReplace size="1.125rem" />
        </IconButton>
    );
};

// Similar changes can be made to DiffButton, CodeApplyButton, FileApplyButton, and CodeCopyButton
const CodeButtons = ({ language, code }) => (
    <Flex
        gap="5px"
        justify="flex-start"
        align="flex-start"
        direction="row"
        wrap="wrap"
        style={{ position: 'absolute', top: 8, right: 10 }}
    >
        <CodeCopyButton code={code} />
        {language && language === 'commitmsg'
            ? <CommitButton code={code} />
            : (
                <>
                    <DiffButton code={code} />
                    <CodeApplyButton code={code} />
                    <FileApplyButton code={code} />
                </>
            )}
    </Flex>
);

export default CodeButtons;