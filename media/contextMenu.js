
function initContextMenu() {
    const messagesContainer = document.getElementById('messages-container');
    const contextMenu = document.getElementById('context-menu');
    const menuItem1 = document.getElementById('menu-item-1');
    let selectedText = '';

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
        messageUtil.sendMessage('code_apply', { content: selectedText });
        hideContextMenu();
    });
}
