

function initInputContainer() {
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');

    messageInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            const message = messageInput.value.trim();
            if (message !== '') {
                sendButton.click();
            }
        }
    });

    sendButton.addEventListener('click', () => {
        const message = messageInput.value;
        if (message) {
            // Add the user's message to the chat UI
            addMessageToUI('user', message);
    
            // Clear the input field
            messageInput.value = '';
    
            // Process and send the message to the extension
            messageUtil.sendMessage({
                command: 'sendMessage',
                text: message
            });
        }
    });

    messageUtil.registerHandler('file_select', (message) => {
        addFileToMessageInput(message.filePath);
    });

    messageUtil.registerHandler('code_select', (message) => {
        addCodeToMessageInput(message.codeBlock);
    });
}

function addFileToMessageInput(filePath) {
    const messageInput = document.getElementById('message-input');
    const formattedPath = `[context|${filePath}] `;
    messageInput.value = formattedPath + messageInput.value;
    messageInput.focus();
}

function addCodeToMessageInput(codeBlock) {
    const messageInput = document.getElementById('message-input');
    messageInput.value += "\n" + codeBlock + "\n";
    messageInput.focus();
}
