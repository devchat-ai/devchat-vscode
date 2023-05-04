
function initButtonForCodeBlock(codeBlocks) {
    codeBlocks.forEach(block => {
        block.classList.add('code-block');
    });
  
    initClipboard(codeBlocks, (patchContent) => {
        messageUtil.sendMessage({
            command: 'block_apply',
            content: patchContent,
        });
    }, (codeContent) => {
        messageUtil.sendMessage({
            command: 'code_apply',
            content: codeContent,
        });
    }, (codeContent) => {
        messageUtil.sendMessage({
            command: 'code_file_apply',
            content: codeContent,
        });
    });
  }