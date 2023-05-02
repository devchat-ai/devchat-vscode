
const vscode_api = acquireVsCodeApi();

class MessageUtil {
  constructor() {
    this.handlers = {};
  }

  // Register a message handler for a specific message type
  registerHandler(messageType, handler) {
    if (!this.handlers[messageType]) {
      this.handlers[messageType] = [];
    }
    this.handlers[messageType].push(handler);
  }

  // Unregister a message handler for a specific message type
  unregisterHandler(messageType, handler) {
    if (this.handlers[messageType]) {
      this.handlers[messageType] = this.handlers[messageType].filter(
        (h) => h !== handler
      );
    }
  }

  // Handle a received message
  handleMessage(message) {
    console.log("handleMessage", message)
    const handlers = this.handlers[message.command];
    if (handlers) {
      handlers.forEach((handler) => handler(message));
    }
  }

  // Send a message to the VSCode API
  sendMessage(message) {
    console.log("sendMessage", message)
    vscode_api.postMessage(message);
  }
}

// Export the MessageUtil class as a module
const messageUtil = new MessageUtil();
