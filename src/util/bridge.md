## sendMessage

- getUserAccessKey // 获取 access key
- doCommit // 提交代码
- updateSetting // 更新设置（目前只有更换模型）
- getSetting // 获取默认模型
- deleteChatMessage // 删除最近一条消息
- show_diff // 调用 editor 代码对比
  -- later --
- stopDevChat // 停止生成
- doCommand //
  -- content
  // 1. 打开设置
  // 2. 启动 ask code 安装
  // 3. 设置 access key
- featureToggles ？？
- isDevChatInstalled // 判断 ask code 是否安装

- historyMessages // 页面的历史消息
- contextDetail // 获取 appendContext 响应之后，发送次请求获取文件的内容
- addContext // 点击 context 菜单（比如 git diff）之后发送到消息
- code_file_apply // 代码应用到 editor，替换 current file
- code_apply // 代码应用到 editor 光标位置
- sendMessage // 发送消息
- regeneration // 错误时重新生成
- regContextList // git diff 之类的列表
- regModelList // model 列表
- regCommandList // 输入 / 之后出现的列表

## registerHandler

- getUserAccessKey // 获取 access key
- regCommandList // 获取 / 之后出现的列表
- appendContext // 右键添加到 context 或者 context 菜单点击的响应
- contextDetailResponse // 获取到的文件内容
- loadHistoryMessages // 与 historyMessages 对应
- isDevChatInstalled // 与 isDevChatInstalled 对应
- deletedChatMessage // 与 deleteChatMessage 对应·
- regContextList // 与 regContextList 对应
- regModelList // 与 regModelList
- receiveMessagePartial // 部分对话
- receiveMessage // 对话
- systemMessage // 没用了

# css

--vscode-editor-font-familyy
--vscode-editor-font-size
--vscode-dropdown-background
--vscode-dropdown-border
--vscode-foreground
--vscode-sideBar-background
--vscode-dropdown-foreground
--vscode-menu-foreground
--vscode-commandCenter-activeForeground
--vscode-commandCenter-activeBackground
--vscode-menu-border
--vscode-menu-background
--vscode-commandCenter-border
--vscode-editor-foreground
--vscode-input-background
--vscode-input-border
--vscode-input-foreground
--vscode-disabledForeground
--vscode-toolbar-activeBackground
