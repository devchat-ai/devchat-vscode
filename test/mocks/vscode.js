// test/mocks/vscode.js

// 定义一个模拟的openTextDocument函数
function openTextDocumentMock() {
    return new Promise(resolve => {
        // 模拟异步返回一个文档对象
        resolve({
            // 根据需要模拟文档对象的属性和方法
            getText: () => "模拟文档内容",
            // 其他需要模拟的方法和属性
        });
    });
}

// 定义一个模拟的showTextDocument函数
function showTextDocumentMock(document, options) {
    return new Promise(resolve => {
        // 模拟异步打开文档的行为
        resolve({
            // 模拟视图或编辑器的响应
            // 例如：
            viewColumn: options?.viewColumn,
            // 其他需要模拟的方法和属性
        });
    });
}

// 导出一个对象，该对象模拟vscode模块的一些API
module.exports = {
    workspace: {
        openTextDocument: openTextDocumentMock,
        // 其他workspace下需要模拟的API
    },
    window: {
        showTextDocument: showTextDocumentMock,
        // 其他window下需要模拟的API
    },
    // 根据需要继续添加其他模拟的vscode API
};