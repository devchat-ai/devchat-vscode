// main.js

(function () {
    initMessageContainer();
    initInputContainer();
    initContextMenu();

    window.addEventListener('message', (event) => {
        const message = event.data;
        messageUtil.handleMessage(message)
    });
})();

