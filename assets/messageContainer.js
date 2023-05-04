
function requestHistoryMessages() {
    // Send a message to the extension with the 'historyMessages' command
    messageUtil.sendMessage({
        command: 'historyMessages',
    });
}

function loadHistoryMessages(entries) {
  entries.forEach((entry) => {
    addMessageToUI('user', entry.message);
    addMessageToUI('bot', entry.response);
  });
}

function initMessageContainer() {
    // Register message handlers for receiving messages from the extension
    messageUtil.registerHandler('receiveMessage', (message) => {
        // Add the received message to the chat UI as a bot message
        addMessageToUI('bot', message.text);
    });

    messageUtil.registerHandler('receiveMessagePartial', (message) => {
        // Add the received message to the chat UI as a bot message
        addMessageToUI('bot', message.text, true);
    });

    messageUtil.registerHandler('loadHistoryMessages', (message) => {
        loadHistoryMessages(message.entries);
    });

    // Request history messages when the web view is created and shown
    requestHistoryMessages();
}