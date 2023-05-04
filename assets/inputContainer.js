
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
    const addContextButton = document.getElementById('add-context-button');
    const addCommandButton = document.getElementById('add-command-button');
    const popupContextMenu = document.getElementById('popupContextMenu');
    const popupCommandMenu = document.getElementById('popupCommandMenu');

    let contextList = [];
    let commandList = [];

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

    addContextButton.addEventListener('click', (event) => {
        popupContextMenu.style.display = popupContextMenu.style.display === 'block' ? 'none' : 'block';
        // 设置弹出菜单的位置
        popupContextMenu.style.left = event.pageX + 'px';
        popupContextMenu.style.top = event.pageY + 'px';
    });

    addCommandButton.addEventListener('click', (event) => {
        popupCommandMenu.style.display = popupCommandMenu.style.display === 'block' ? 'none' : 'block';
        // 设置弹出菜单的位置
        popupCommandMenu.style.left = event.pageX + 'px';
        popupCommandMenu.style.top = event.pageY + 'px';
    });

    messageUtil.registerHandler('file_select', (message) => {
        addFileToMessageInput(message.filePath);
    });

    messageUtil.registerHandler('code_select', (message) => {
        addCodeToMessageInput(message.codeBlock);
    });

    messageUtil.registerHandler('appendContext', (message) => {
        addCodeToMessageInput(message.context);
    });

    messageUtil.registerHandler('regContextList', (message) => {
        contextList = message.result;

        const menuItems = [];
        for (let i = 0; i < contextList.length; i++) {
            menuItems.push({
                text: contextList[i].name,
                href: contextList[i].name
            });
        }

        menuItems.forEach(item => {
            const menuItem = document.createElement('a');
            menuItem.textContent = 'add ' + item.text;
            menuItem.href = item.text;

            popupContextMenu.appendChild(menuItem);

            // 为每个菜单项添加点击事件监听器
            menuItem.addEventListener('click', (event) => {
                // 阻止<a>标签的默认行为（例如导航到链接）
                event.preventDefault();
                // 在此处定义点击处理逻辑
                messageUtil.sendMessage({ command: 'addContext', selected: item.href })
                // 隐藏弹出菜单
                popupContextMenu.style.display = 'none';
            });
        });
    });

    messageUtil.registerHandler('regCommandList', (message) => {
        commandList = message.result;

        const menuItems = [];
        for (let i = 0; i < commandList.length; i++) {
            menuItems.push({
                text: commandList[i].pattern,
                href: commandList[i].pattern
            });
        }

        menuItems.forEach(item => {
            const menuItem = document.createElement('a');
            menuItem.textContent = item.text;
            menuItem.href = item.href;

            popupCommandMenu.appendChild(menuItem);

            // 为每个菜单项添加点击事件监听器
            menuItem.addEventListener('click', (event) => {
                // 阻止<a>标签的默认行为（例如导航到链接）
                event.preventDefault();
                // 在此处定义点击处理逻辑
                addCodeToMessageInput("/" + item.href);
                // 隐藏弹出菜单
                popupCommandMenu.style.display = 'none';
            });
        });
    });

    messageUtil.sendMessage({ command: 'regContextList' });
    messageUtil.sendMessage({ command: 'regCommandList' });
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
