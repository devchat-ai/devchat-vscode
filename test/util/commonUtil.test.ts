// test/commonUtil.test.ts

import { expect } from 'chai';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
	createTempSubdirectory,
	CommandRun,
	runCommandAndWriteOutput,
	runCommandStringAndWriteOutput,
	getLanguageIdByFileName,
} from '../../src/util/commonUtil';
import { UiUtilWrapper } from '../../src/util/uiUtil';

import sinon from 'sinon';

describe('commonUtil', () => {
	afterEach(() => {
		sinon.restore();
	});

	describe('createTempSubdirectory', () => {
		it('should create a temporary subdirectory', () => {
			const tempDir = os.tmpdir();
			const subdir = 'test-subdir';
			const targetDir = createTempSubdirectory(subdir);

			expect(targetDir.startsWith(path.join(tempDir, subdir))).to.be.true;
			expect(fs.existsSync(targetDir)).to.be.true;
			fs.rmdirSync(targetDir, { recursive: true });
		});
	});

	describe('CommandRun', () => {
		it('should run a command and capture stdout and stderr', async () => {
			const command = 'echo';
			const args = ['hello', 'world'];
			const options = { shell: true };

			const run = new CommandRun();
			const result = await run.spawnAsync(command, args, options, undefined, undefined, undefined, undefined);

			expect(result.exitCode).to.equal(0);
			expect(result.stdout.trim()).to.equal('hello world');
			expect(result.stderr).to.equal('');
		});

		it('should run a command and write output to a file', async () => {
			const command = 'echo';
			const args = ['hello', 'world'];
			const options = { shell: true };
			const outputFile = path.join(os.tmpdir(), 'test-output.txt');

			const run = new CommandRun();
			const result = await run.spawnAsync(command, args, options, undefined, undefined, undefined, outputFile);

			expect(result.exitCode).to.equal(0);
			expect(result.stdout.trim()).to.equal('hello world');
			expect(result.stderr).to.equal('');
			expect(fs.readFileSync(outputFile, 'utf-8').trim()).to.equal('hello world');
			fs.unlinkSync(outputFile);
		});

		it('should handle command not found error and output the error message', async () => {
			const command = 'nonexistent-command';
			const args: string[] = [];
			const options = { shell: true };

			const run = new CommandRun();

			const result = await run.spawnAsync(
				command,
				args,
				options,
				undefined,
				undefined,
				undefined,
				undefined
			);

			expect(result.exitCode).to.not.equal(0);
			expect(result.stderr).to.include(`${command}: command not found`);
		});
	});

	describe('runCommandAndWriteOutput', () => {
		it('should run a command and write output to a file', async () => {
			const command = 'echo';
			const args: string[] = ['hello', 'world'];
			const outputFile = path.join(os.tmpdir(), 'test-output.txt');

			await runCommandAndWriteOutput(command, args, outputFile);

			expect(fs.readFileSync(outputFile, 'utf-8').trim()).to.equal('hello world');
			fs.unlinkSync(outputFile);
		});
	});
	describe('runCommandStringAndWriteOutput', () => {
		it('should run a command string and write output to a file', async () => {
			const commandString = 'echo hello world';
			const outputFile = path.join(os.tmpdir(), 'test-output.txt');

			await runCommandStringAndWriteOutput(commandString, outputFile);

			const fileContent = fs.readFileSync(outputFile, 'utf-8').trim();
			const parsedContent = JSON.parse(fileContent);

			expect(parsedContent.command).to.equal(commandString);
			expect(parsedContent.content.trim()).to.equal('hello world');
			fs.unlinkSync(outputFile);
		});
	});

	describe('getLanguageIdByFileName', () => {
		beforeEach(() => {
			sinon.stub(UiUtilWrapper, 'languageId').callsFake(async (fileName: string) => {
				const languageIds: { [key: string]: string } = {
					'test.py': 'python',
					'test.js': 'javascript',
					'test.ts': 'typescript',
				};
				return languageIds[fileName];
			});
		});

		afterEach(() => {
			sinon.restore();
		});

		it('should return the correct language ID for a given file name', async () => {
			expect(await getLanguageIdByFileName('test.py')).to.equal('python');
			expect(await getLanguageIdByFileName('test.js')).to.equal('javascript');
			expect(await getLanguageIdByFileName('test.ts')).to.equal('typescript');
			expect(await getLanguageIdByFileName('test.unknown')).to.equal(undefined);
		});
	});
});