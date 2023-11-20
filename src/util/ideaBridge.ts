const JStoIdea = {
  sendMessage: (message: string, context: string = "", parent: string = "") => {
    const params = {
      action: "sendMessage/request",
      metadata: {
        callback: "IdeaToJSMessage",
        parent: parent,
      },
      payload: {
        contexts: [],
        message: message,
      },
    };

    console.log("ready to call java params: ", params);
    window.JSJavaBridge.callJava(JSON.stringify(params));
  },
  getModel: () => {
    const params = {
      action: "listModels/request",
      metadata: {
        callback: "IdeaToJSMessage",
      },
    };

    console.log("getModel ready to call java: ", params);
    window.JSJavaBridge.callJava(JSON.stringify(params));
  },
  getContextList: () => {
    const params = {
      action: "listContexts/request",
      metadata: {
        callback: "IdeaToJSMessage",
      },
    };
    console.log("getContextList ready to call java: ", params);
    window.JSJavaBridge.callJava(JSON.stringify(params));
  },
  getCommandList: () => {
    const params = {
      action: "listCommands/request",
      metadata: {
        callback: "IdeaToJSMessage",
      },
    };
    console.log("getCommandList ready to call java: ", params);
    window.JSJavaBridge.callJava(JSON.stringify(params));
  },
  insertCode: (code) => {
    const params = {
      action: "insertCode/request",
      metadata: {
        callback: "IdeaToJSMessage",
      },
      payload: {
        content: code,
      },
    };
    console.log("insertCode ready to call java: ", params);
    window.JSJavaBridge.callJava(JSON.stringify(params));
  },

  replaceFileContent: (code) => {
    const params = {
      action: "replaceFileContent/request",
      metadata: {
        callback: "IdeaToJSMessage",
      },
      payload: {
        content: code,
      },
    };
    console.log("replaceFileContent ready to call java: ", params);
    window.JSJavaBridge.callJava(JSON.stringify(params));
  },

  viewDiff: (code) => {
    const params = {
      action: "viewDiff/request",
      metadata: {
        callback: "IdeaToJSMessage",
      },
      payload: {
        content: code,
      },
    };
    console.log("viewDiff ready to call java: ", params);
    window.JSJavaBridge.callJava(JSON.stringify(params));
  },
};

class IdeaBridge {
  private static instance: IdeaBridge;
  handle: any = {};

  constructor() {
    this.handle = {};
    // 注册全局的回调函数，用于接收来自IDEA的消息
    window.IdeaToJSMessage = (res: any) => {
      console.log("IdeaToJSMessage message: ", res);
      switch (res.action) {
        case "sendMessage/response":
          this.resviceMessage(res);
          break;
        case "listModels/response":
          this.resviceModelList(res);
          break;
        case "listContexts/response":
          this.resviceContextList(res);
          break;
        case "listCommands/response":
          this.resviceCommandList(res);
          break;
        default:
          break;
      }
    };
  }

  resviceCommandList(res) {
    const result = res.payload.commands.map((item) => ({
      name: item.name,
      pattern: item.name,
      description: item.description,
    }));
    this.handle.regCommandList({
      result,
    });
  }

  resviceContextList(res) {
    // 接受到的上下文列表
    console.log("resviceContextList res: ", res);
    const result = res.payload.contexts.map((item) => ({
      name: item.command,
      pattern: item.command,
      description: item.description,
    }));
    console.log("resviceContextList result: ", result);
    this.handle.regContextList({ result });
  }

  resviceModelList(response: any) {
    console.log("resviceModelList response: ", response);
    // 接受到模型列表
    this.handle["regModelList"]({
      result: response.payload.models,
    });
  }

  resviceMessage(response: any) {
    // 接受到消息
    if (response.metadata.isFinalChunk) {
      // 结束对话
      this.handle["receiveMessage"]({
        text: response.payload.message || response.metadata.error,
        isError: response.metadata.error.length > 0,
        hash: response.payload.promptHash || "",
      });
    } else {
      this.handle["receiveMessagePartial"]({
        text: response.payload.message,
      });
    }
  }

  public static getInstance(): IdeaBridge {
    if (!IdeaBridge.instance) {
      IdeaBridge.instance = new IdeaBridge();
    }
    return IdeaBridge.instance;
  }

  registerHandler(messageType: string, handler: any) {
    // 注册回调函数
    this.handle[messageType] = handler;
  }

  sendMessage(message: any) {
    // 根据 command 分发到不同的方法·
    switch (message.command) {
      // 发送消息
      case "sendMessage":
        JStoIdea.sendMessage(message.text, message.context, message.parent);
        break;
      // 重新生成消息，用于发送失败时再次发送
      case "regeneration":
        JStoIdea.sendMessage(message.text, message.context, message.parent);
        break;
      // 请求 model 列表
      case "regModelList":
        JStoIdea.getModel();
        break;
      case "regContextList":
        JStoIdea.getContextList();
        break;
      case "regCommandList":
        JStoIdea.getCommandList();
        break;
      case "code_apply":
        JStoIdea.insertCode(message.content);
        break;
      case "code_file_apply":
        JStoIdea.replaceFileContent(message.content);
        break;
      default:
        break;
    }
  }
}

export default IdeaBridge.getInstance();
