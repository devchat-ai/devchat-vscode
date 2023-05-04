// chatUI.js


function getLastBotMessageItem(messagesContainer) {
  const lastMessage = messagesContainer.lastElementChild;

  if (lastMessage && lastMessage.classList.contains('message-item')) {
      const lastMessageIcon = lastMessage.querySelector('i');
      if (lastMessageIcon && lastMessageIcon.classList.contains('fa-robot')) {
          return lastMessage;
      }
  }

  return null;
}

function botMessageUpdate(role, content, partial) {
    // Create a MarkdownIt instance for rendering markdown content
    const messagesContainer = document.getElementById('messages-container');
    let lastBotMessage = getLastBotMessageItem(messagesContainer);

    if (lastBotMessage == null) {
      return false
    }

    // Render the markdown content inside the message content container
    const renderedContent = markdownRender(content);
    const lastMessageContent = lastBotMessage.querySelector('.message-content');
    lastMessageContent.innerHTML = renderedContent;

    if (!partial) {
        // Find any code blocks in the rendered content and add a class to style them
        const codeBlocks = lastMessageContent.querySelectorAll('pre > code');
  
        // Initialize the Apply Patch functionality
        initButtonForCodeBlock(codeBlocks);
    }

    return true;
}

function addSenderIcon(messageItem, role) {
  // Create a sender icon element and add the appropriate class based on the role (user or bot)
  const senderIcon = document.createElement('i');
  const iconClasses = role === 'user' ? ['fas', 'fa-user-circle'] : ['fas', 'fa-robot'];
  senderIcon.classList.add(...iconClasses);
  messageItem.appendChild(senderIcon);
}

function addMessageContent(messageItem, renderedContent, role) {
  // Create a container for the message content
  const messageContent = document.createElement('div');
  messageContent.classList.add('message-content');
  messageContent.innerHTML = renderedContent;

  // Find any code blocks in the rendered content and add a class to style them
  const codeBlocks = messageContent.querySelectorAll('pre > code');

  // Initialize the Apply Patch functionality
  if (role != "user") {
    initButtonForCodeBlock(codeBlocks);
  }
  messageItem.appendChild(messageContent);
  messageItemActions(messageItem, messageContent, role);
}

function addMessageItem(messagesContainer, content, role) {
  // Render the markdown content inside the message content container
  let renderedContent = markdownRender(content);
  if (role == "user") {
    renderedContent = markdownRender("\`\`\`\n" + content);
  }
  
  const messageItem = document.createElement('div');
  messageItem.classList.add('message-item');

  addSenderIcon(messageItem, role);
  addMessageContent(messageItem, renderedContent, role);
  
  messagesContainer.appendChild(messageItem);
}

function addMessageToUI(role, content, partial = false) {
    // Create a MarkdownIt instance for rendering markdown content
    const messagesContainer = document.getElementById('messages-container');

    if (role == "bot" && botMessageUpdate(role, content, partial)) {
      return
    }

    addMessageItem(messagesContainer, content, role);
    // Scroll the messages container to the bottom to display the latest message
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

