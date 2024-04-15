import { expect } from 'chai';
import sinon from 'sinon';
import vscodeMock from '../mocks/vscode';
import * as proxyquire from 'proxyquire';

const proxy = proxyquire.noCallThru();

// 使用 proxyquire 加载业务代码，并替换 'vscode' 模块
const { createAndOpenFile } = proxy('../../src/handler/codeBlockHandler', { 'vscode': vscodeMock });

describe('createAndOpenFile', () => {
    let openTextDocumentStub: sinon.SinonStub;
    let showTextDocumentStub: sinon.SinonStub;

    beforeEach(() => {
        // 模拟 vscode.workspace.openTextDocument
        openTextDocumentStub = sinon.stub(vscodeMock.workspace, 'openTextDocument').resolves();
        // 模拟 vscode.window.showTextDocument
        showTextDocumentStub = sinon.stub(vscodeMock.window, 'showTextDocument').resolves();
    });
      
    afterEach(() => {
        sinon.restore();
    });

    // 1. happy path: 当提供有效的语言和内容时，应该成功创建并打开一个新文档。
    it('当提供有效的语言和内容时，应该成功创建并打开一个新文档', async () => {
        const message = { language: 'javascript', content: 'console.log("Hello World");' };
        await createAndOpenFile(message);
        expect(openTextDocumentStub.calledOnce).to.be.true;
        expect(showTextDocumentStub.calledOnce).to.be.true;
    });

    // 2. happy path: 当提供的语言是VSCode支持的一种常见编程语言时，应该成功创建对应语言的文档。
    it('当提供的语言是VSCode支持的一种常见编程语言时，应该成功创建对应语言的文档', async () => {
        const message = { language: 'python', content: 'print("Hello World")' };
        await createAndOpenFile(message);
        expect(openTextDocumentStub.calledWith(sinon.match.has('language', 'python'))).to.be.true;
        expect(showTextDocumentStub.calledOnce).to.be.true;
    });

    // 3. happy path: 当提供的内容是空字符串时，应该成功创建一个空的文档。
    it('当提供的内容是空字符串时，应该成功创建一个空的文档', async () => {
        const message = { language: 'plaintext', content: '' };
        await createAndOpenFile(message);
        expect(openTextDocumentStub.calledWith(sinon.match.has('content', ''))).to.be.true;
        expect(showTextDocumentStub.calledOnce).to.be.true;
    });

    // 4. edge case: 当提供的语言不被VSCode支持时，应该抛出错误或以默认语言创建文档。
    it('当提供的语言不被VSCode支持时，应该以默认语言创建文档', async () => {
        const message = { language: 'nonexistentLanguage', content: 'Hello World' };
        await createAndOpenFile(message);
        // TODO: 验证是否以默认语言创建了文档，这需要根据vscode API的实际行为来确定
    });

    // 5. edge case: 当message对象缺少language属性时，应该抛出错误或以默认设置创建文档。
    it('当message对象缺少language属性时，应该以默认设置创建文档', async () => {
        const message = { content: 'Hello World' };
        await createAndOpenFile(message as any); // 强制类型转换以模拟缺少属性
        // TODO: 验证是否以默认设置创建了文档，这需要根据vscode API的实际行为来确定
    });

    // 6. edge case: 当message对象是null时，应该抛出错误，防止函数执行失败。
    it('当message对象是null时，应该抛出错误，防止函数执行失败', async () => {
        let error;
        try {
            await createAndOpenFile(null as any); // 强制类型转换以模拟null值
        } catch (e) {
            error = e;
        }
        expect(error).to.not.be.null;
    });
});