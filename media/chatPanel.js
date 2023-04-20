(function () {
  const vscode = acquireVsCodeApi();

  const messageInput = document.getElementById('message-input');
  const sendButton = document.getElementById('send-button');
  const messagesContainer = document.getElementById('messages-container');

  function addMessageToUI(message, senderIconClass, actionIconClass, messageType) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', messageType);

    const senderIcon = document.createElement('i');
    senderIcon.className = senderIconClass;

    const messageText = document.createElement('span');
    messageText.classList.add('message-text');
    messageText.textContent = message;

    const actionIcon = document.createElement('i');
    actionIcon.className = actionIconClass;

    messageElement.appendChild(senderIcon);
    messageElement.appendChild(messageText);
    messageElement.appendChild(actionIcon);
    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  function processMessage(message) {
      // Process the message and get the bot's response
      // For an echo bot, return the same message
      return message;
    }
  
    sendButton.addEventListener('click', () => {
      const message = messageInput.value;
      if (message) {
        const userIconClass = 'fas fa-user-circle';
        const botIconClass = 'fas fa-robot';
        const actionIconClass = 'fas fa-check-circle';
  
        addMessageToUI(message, userIconClass, actionIconClass, 'user-message');
        messageInput.value = '';
  
        const botResponse = processMessage(message);
        addMessageToUI(botResponse, botIconClass, actionIconClass, 'bot-message');
      }
    });
  
    messageInput.addEventListener('keypress', (event) => {
      if (event.key === 'Enter') {
        sendButton.click();
      }
    });
  })();
  
  