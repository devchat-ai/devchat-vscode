


function processMessageUI(message) {
    addMessageToUI('user', message);
    messageUtil.sendMessage({
        command: 'sendMessage',
        text: message});
}

function userMessageActions(messageItem, onCancel, onSend, onEdit) {
    const buttonGroup = document.createElement('div');
    buttonGroup.classList.add('button-group');

    const cancelButton = document.createElement('button');
    cancelButton.classList.add('cancel-button');
    cancelButton.innerText = 'Cancel';
    buttonGroup.appendChild(cancelButton);

    const sendButton = document.createElement('button');
    sendButton.classList.add('send-button');
    sendButton.innerText = 'Send';
    buttonGroup.appendChild(sendButton);

    const editButton = document.createElement('button');
    editButton.classList.add('edit-button');
    editButton.innerHTML = '<i class="fas fa-edit"></i>';
    buttonGroup.appendChild(editButton);

    messageItem.appendChild(buttonGroup);

    // Initially hide the cancel and send buttons
    cancelButton.style.display = 'none';
    sendButton.style.display = 'none';

    // Add a click listener to the edit button
    editButton.addEventListener('click', () => {
        // Hide the edit button and show the cancel and send buttons
        editButton.style.display = 'none';
        cancelButton.style.display = 'inline-block';
        sendButton.style.display = 'inline-block';

        // Add your existing edit button functionality here
        onEdit();
    });

    // Add an event listener for the cancel button
    cancelButton.addEventListener('click', () => {
        // Hide the cancel and send buttons and show the edit button
        cancelButton.style.display = 'none';
        sendButton.style.display = 'none';
        editButton.style.display = 'inline-block';

        // Add your existing cancel button functionality here
        onCancel();
    });

    // Add an event listener for the send button
    sendButton.addEventListener('click', () => {
        // Hide the cancel and send buttons and show the edit button
        cancelButton.style.display = 'none';
        sendButton.style.display = 'none';
        editButton.style.display = 'inline-block';

        // Add your existing save button functionality here
        onSend();
    });
}

function messageItemActions(messageItem, messageContent, role) {
    if (role === 'user') {
        userMessageActions(messageItem, () => { // onCancel
            const textArea = messageItem.querySelector('.edit-textarea');
            textArea.replaceWith(messageContent)
            // Remove the text area, save button, and cancel button
            textArea.remove();
        }, () => { // onSend
            const textArea = messageItem.querySelector('.edit-textarea');
            const newMessage = textArea.value.trim();
            if (newMessage !== '') {
                textArea.replaceWith(messageContent)
                // Remove the text area, save button, and cancel button
                textArea.remove();

                // Process and send the new message to the extension
                processMessageUI(newMessage);
            }
        }, () => { // onEdit
            // Create a new text area element with the same size as the message content
            const textArea = document.createElement('textarea');
            textArea.classList.add('edit-textarea');
            textArea.style.width = `${messageContent.offsetWidth}px`;
            textArea.style.height = `${messageContent.offsetHeight}px`;
            textArea.value = messageContent.textContent.trim();
            messageContent.replaceWith(textArea);

            // Focus on the text area
            textArea.focus();
        });
    } else {
        // TODO 
        // currently there is no action for the bot message
        // 
        // const actionIcon = document.createElement('i');
        // actionIcon.className = 'fas fa-check-circle';
        // messageItem.appendChild(actionIcon);
    }
}