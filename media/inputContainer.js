
const messageInput = document.getElementById('message-input');
const inputContainer = document.getElementById('input-container');

const defaultHeight = 16;

function autoResizeTextarea() {
    const lineCount = (messageInput.value.match(/\n/g) || []).length + 1;
    messageInput.style.height = 'auto';
    messageInput.style.height = (lineCount <= 1 ? defaultHeight : messageInput.scrollHeight) + 'px';
    inputContainer.style.height = 'auto';
    inputContainer.style.height = messageInput.style.height + 25;
}

messageInput.addEventListener('input', autoResizeTextarea);

autoResizeTextarea();

function initInputContainer() {
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');

    messageInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            if (e.ctrlKey) {
                e.preventDefault();
                const message = messageInput.value.trim();
                if (message !== '') {
                    sendButton.click();
                }
            } else if (!e.shiftKey) {
                e.preventDefault();
                messageInput.setRangeText('\n', messageInput.selectionStart, messageInput.selectionEnd, 'end');
                autoResizeTextarea();
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
            autoResizeTextarea();
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
