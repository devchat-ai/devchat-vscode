// main.js

(function () {
  // Get DOM elements for user interaction and message display
  const messagesContainer = document.getElementById('messages-container');
  const messageInput = document.getElementById('message-input');
  const sendButton = document.getElementById('send-button');
  const contextMenu = document.getElementById('context-menu');
  const menuItem1 = document.getElementById('menu-item-1');
  const menuItem2 = document.getElementById('menu-item-2');
  let selectedText = '';

  // Initialize input resizing
  initInputResizing();

  function hideContextMenu() {
    contextMenu.style.display = 'none';
  }

  function getSelectedText() {
    const selection = window.getSelection();
    return selection.toString();
  }  
  
  messagesContainer.addEventListener('contextmenu', (event) => {
    event.preventDefault();
    selectedText = getSelectedText();
    contextMenu.style.display = 'block';
    contextMenu.style.left = event.pageX + 'px';
    contextMenu.style.top = event.pageY + 'px';
  });
  
  document.addEventListener('click', hideContextMenu);
  
  menuItem1.addEventListener('click', () => {
    postVSCodeMessage({
      command: 'code_apply',
      content: selectedText,
    });
    hideContextMenu();
  });
  
  menuItem2.addEventListener('click', () => {
    navigator.clipboard.writeText(selectedText);
    hideContextMenu();
  });

  // Event listener for receiving messages from the extension
  window.addEventListener('message', (event) => {
    const message = event.data;
    switch (message.command) {
      case 'receiveMessage':
        // Add the received message to the chat UI as a bot message
        addMessageToUI('bot', message.text);
        break;
      case 'receiveMessagePartial':
        // Add the received message to the chat UI as a bot message
        addMessageToUI('bot', message.text, true);
        break;
      case 'loadHistoryMessages':
        loadHistoryMessages(message.entries);
        break;
      case 'file_select':
        addFileToMessageInput(message.filePath);
        break;
      case 'code_select':
        addCodeToMessageInput(message.codeBlock);
        break
      case 'ask_ai':
        message_text = message.codeBlock + "\n" + message.question;
        processMessageUI(message_text)
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

  function addFileToMessageInput(filePath) {
    const formattedPath = `[context|${filePath}] `;
    messageInput.value = formattedPath + messageInput.value;
    messageInput.focus();
  }

  function addCodeToMessageInput(codeBlock) {
    messageInput.value += "\n" + codeBlock + "\n";
    messageInput.focus();
  }

  // Request history messages when the web view is created and shown
  requestHistoryMessages();
})();

// Function to load history messages from the extension
function loadHistoryMessages(entries) {
  entries.forEach((entry) => {
    addMessageToUI('user', entry.message);
    addMessageToUI('bot', entry.response);
  });
}
