const JStoIdea = {
  sendMessage: (message: string, context: any = [], parent: string = "") => {
    const paramsContext: any = [];
    if (Array.isArray(context) && context.length > 0) {
      context.forEach((item) => {
        paramsContext.push({
          type: "code",
          ...item.context,
        });
      });
    }
    const params = {
      action: "sendMessage/request",
      metadata: {
        callback: "IdeaToJSMessage",
        parent: parent,
      },
      payload: {
        contexts: paramsContext,
        message: message,
      },
    };
    console.log("ready to send message: ", params);
    window.JSJavaBridge.callJava(JSON.stringify(params));
  },
  getModel: () => {
    const params = {
      action: "listModels/request",
      metadata: {
        callback: "IdeaToJSMessage",
      },
      payload: {},
    };
    window.JSJavaBridge.callJava(JSON.stringify(params));
  },
  getContextList: () => {
    const params = {
      action: "listContexts/request",
      metadata: {
        callback: "IdeaToJSMessage",
      },
      payload: {},
    };

    window.JSJavaBridge.callJava(JSON.stringify(params));
  },
  getCommandList: () => {
    const params = {
      action: "listCommands/request",
      metadata: {
        callback: "IdeaToJSMessage",
      },
      payload: {},
    };

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

    window.JSJavaBridge.callJava(JSON.stringify(params));
  },
  getUserAccessKey: () => {
    // 这里需要发送一个请求，获取完整的用户设置
    const params = {
      action: "getSetting/request",
      metadata: {
        callback: "IdeaToJSMessage",
      },
      payload: {},
    };
    window.JSJavaBridge.callJava(JSON.stringify(params));
  },
  etcCommand: (command: any) => {
    /**
     * 有四种命令
     * 1. workbench.action.openSettings
     * 2. AskCodeIndexStart
     * 3. AccessKey.OpenAI
     * 4. AccessKey.DevChat
     */
    const content = Array.isArray(command.content) ? command.content[0] : "";
    switch (content) {
      case "workbench.action.openSettings":
        // 打开设置
        const params = {
          action: "showSettingDialog/request",
          metadata: {
            callback: "IdeaToJSMessage",
          },
          payload: {},
        };

        window.JSJavaBridge.callJava(JSON.stringify(params));
        break;
      case "AccessKey.DevChat":
        // 设置key
        break;
      default:
        break;
    }
  },
  getTopicList: () => {
    // 获取 topic 列表
    const params = {
      action: "listTopics/request",
      metadata: {
        callback: "IdeaToJSMessage",
      },
      payload: {},
    };

    window.JSJavaBridge.callJava(JSON.stringify(params));
  },
  updateSetting: (value: string) => {
    // 因为现在只有更换模型，所以直接取 value
    const params = {
      action: "updateSetting/request",
      metadata: {
        callback: "IdeaToJSMessage",
      },
      payload: {
        setting: {
          currentModel: value,
        },
      },
    };
    window.JSJavaBridge.callJava(JSON.stringify(params));
  },
  commit: (code: string) => {
    const params = {
      action: "commitCode/request",
      metadata: {
        callback: "IdeaToJSMessage",
      },
      payload: {
        message: code,
      },
    };
    window.JSJavaBridge.callJava(JSON.stringify(params));
  },
  getTopicDetail: (topicHash: string) => {
    const params = {
      action: "loadConversations/request",
      metadata: {
        callback: "IdeaToJSMessage",
        topicHash: topicHash,
      },
      payload: {},
    };

    window.JSJavaBridge.callJava(JSON.stringify(params));
  },
  historyMessages: (message) => {
    const params = {
      action: "loadHistoryMessages/request",
      metadata: {
        callback: "IdeaToJSMessage",
      },
      payload: {
        pageIndex: message?.page || 0,
      },
    };

    window.JSJavaBridge.callJava(JSON.stringify(params));
  },
  deleteChatMessage: (message) => {
    const params = {
      action: "deleteLastConversation/request",
      metadata: {
        callback: "IdeaToJSMessage",
      },
      payload: {
        promptHash: message?.hash || "",
      },
    };

    window.JSJavaBridge.callJava(JSON.stringify(params));
  },
  openLink: (message) => {
    if (!message?.url) {
      return false;
    }
    const params = {
      action: "openLink/request",
      metadata: {
        callback: "IdeaToJSMessage",
      },
      payload: {
        url: message?.url || "",
      },
    };

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
      console.log("IdeaToJSMessage: ", res);
      switch (res.action) {
        case "deleteLastConversation/response":
          this.resviceDeleteMessage(res);
          break;
        case "loadHistoryMessages/response":
          this.resviceHistoryMessages(res);
          break;
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
        // 这里暂时不用，因为获取到的只有 key，信息不全
        // 所以用 resviceSettings 来获取
        // case "getKey/response":
        //   this.resviceAccessKey(res.payload.key);
        //   break;
        case "addContext/notify":
          this.resviesContext(res);
          break;
        case "getSetting/response":
          this.resviceSettings(res);
          break;
        case "listTopics/response":
          this.resviceTopicList(res);
          break;
        case "loadConversations/response":
          this.resviceTopicDetail(res);
          break;
        default:
          break;
      }
    };
  }

  resviceDeleteMessage(res) {
    const hash = res?.payload?.promptHash || "";
    this.handle.deletedChatMessage({
      hash,
    });
  }

  resviceHistoryMessages(res) {
    const list: any = [];
    if (res?.payload?.messages?.length > 0) {
      res?.payload?.messages.forEach((item) => {
        list.push({
          ...item,
          response: item.responses?.join("\n"),
        });
      });
    }

    this.handle.reloadMessage({
      entries: list.reverse(),
      pageIndex: 0,
    });
  }

  resviceTopicDetail(res) {
    // 用于重置后端全局的 topic id
    if (res?.payload?.reset) {
      // 重置后请求历史消息
      JStoIdea.historyMessages({ page: 0 });
    }
  }

  resviceTopicList(res) {
    const list = res.payload.topics;
    this.handle.listTopics(list);
  }

  resviesContext(res) {
    const params = {
      file: res.payload.path,
      result: "",
    };
    const contextObj = {
      path: res.payload.path,
      content: res.payload.content,
      command: "",
    };
    params.result = JSON.stringify(contextObj);
    this.handle.contextDetailResponse(params);
  }

  resviceSettings(res) {
    // 用户设置的回调
    const setting = res.payload.setting;

    // 当前的默认模型
    this.handle.getSetting({
      value: setting.currentModel,
    });
    this.handle.getUserAccessKey({
      endPoint: setting.apiBase,
      accessKey: setting.apiKey,
      keyType: setting.apiKey.startsWith("DC") ? "DevChat" : "OpenAi",
    });
  }

  resviceAccessKey(res: string = "") {
    const params = {
      endPoint: "",
      accessKey: res,
      keyType: res.startsWith("DC") ? "DevChat" : "OpenAi",
    };
    this.handle.getUserAccessKey(params);
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

    const result = res.payload.contexts.map((item) => ({
      name: item.command,
      pattern: item.command,
      description: item.description,
    }));

    this.handle.regContextList({ result });
  }

  resviceModelList(response: any) {
    // 接受到模型列表
    this.handle["regModelList"]({
      result: response.payload.models,
    });
  }

  resviceMessage(response: any) {
    console.log(
      "response.metadata.isFinalChunk: ",
      response.metadata.isFinalChunk
    );
    // 接受到消息
    if (response.metadata?.isFinalChunk) {
      // 结束对话
      this.handle["receiveMessage"]({
        text: response.payload?.message || response.metadata?.error || "",
        isError: response.metadata?.error.length > 0,
        hash: response.payload?.promptHash || "",
      });
    } else {
      this.handle["receiveMessagePartial"]({
        text: response?.payload?.message || "",
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
        JStoIdea.sendMessage(
          message.text,
          message.contextInfo,
          message.parent_hash
        );
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
      case "getUserAccessKey":
        JStoIdea.getUserAccessKey();
        break;
      case "doCommand":
        JStoIdea.etcCommand(message);
        break;
      case "show_diff":
        JStoIdea.viewDiff(message.content);
        break;
      case "updateSetting":
        JStoIdea.updateSetting(message.value);
        break;
      case "doCommit":
        JStoIdea.commit(message.content);
        break;
      case "listTopics":
        JStoIdea.getTopicList();
        break;
      case "getTopicDetail":
        JStoIdea.getTopicDetail(message.topicHash);
        break;
      case "historyMessages":
        JStoIdea.historyMessages(message);
        break;
      case "deleteChatMessage":
        JStoIdea.deleteChatMessage(message);
        break;
      case "openLink":
        JStoIdea.openLink(message);
        break;
      default:
        break;
    }
  }
}

export default IdeaBridge.getInstance();
