(function () {
    // Get DOM elements for user interaction and message display
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
  
    // Initialize input resizing
    initInputResizing();
  
    // Event listener for receiving messages from the extension
    window.addEventListener('message', (event) => {
      const message = event.data;
      switch (message.command) {
        case 'receiveMessage':
          // Add the received message to the chat UI as a bot message
          addMessageToUI('bot', message.text);
          break;
      }
    });
  
    // Event listener for the send button
    sendButton.addEventListener('click', () => {
      const message = messageInput.value;
      if (message) {
        // Add the user's message to the chat UI
        addMessageToUI('user', message);
  
        // Clear the input field
        messageInput.value = '';
  
        // Process and send the message to the extension
        processMessage(message);
      }
    });
  
    // Event listener for the Enter key in the message input field
    messageInput.addEventListener('keypress', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const message = messageInput.value.trim();
        if (message !== '') {
          sendButton.click();
        }
      }
    });
  })();
  