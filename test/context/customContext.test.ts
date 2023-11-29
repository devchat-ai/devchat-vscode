import { expect } from 'chai';
import CustomContexts from '../../src/context/customContext';
import fs from 'fs';
import path from 'path';

describe('CustomContexts', () => {
    const workflowsDir = path.join(__dirname, 'test-workflows');

    before(() => {
        // Create a test workflows directory with a sample _setting_.json file
        if (!fs.existsSync(workflowsDir)) {
            fs.mkdirSync(workflowsDir);
        }
        const extensionDir = path.join(workflowsDir, 'extension1', 'context', 'context1');
        fs.mkdirSync(extensionDir, { recursive: true });
        fs.writeFileSync(path.join(extensionDir, '_setting_.json'), JSON.stringify({
            name: 'test-context',
            description: 'Test context',
            command: ['echo', 'Hello, World!']
        }));
    });

    after(() => {
        // Clean up the test workflows directory
        fs.rmdirSync(workflowsDir, { recursive: true });
    });

    it('should parse custom contexts', () => {
        const customContexts = CustomContexts.getInstance();
        customContexts.parseContexts(workflowsDir);
        const contexts = customContexts.getContexts();
        expect(contexts).to.have.lengthOf(1);
        expect(contexts[0].name).to.equal('test-context');
        expect(contexts[0].description).to.equal('Test context');
    });

	
});