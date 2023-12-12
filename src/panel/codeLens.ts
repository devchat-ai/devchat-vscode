import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { has } from 'mobx';

interface FunctionDefinition {
	name: string;
	containerName: string | null;
	range: vscode.Range;
}

type CodeLensRegistration = {
	elementType: string;
	objectName: string;
	promptGenerator: string;
};

export class CodeLensManager {
  private static instance: CodeLensManager;
  private registrations: CodeLensRegistration[] = [];
  private configFilePath: string;

  private constructor() {
    this.configFilePath = path.join(process.env.HOME || process.env.USERPROFILE || '.', '.chat/ideconfig.json');
    this.loadConfig();
  }

  public static getInstance(): CodeLensManager {
    if (!CodeLensManager.instance) {
      CodeLensManager.instance = new CodeLensManager();
    }
    return CodeLensManager.instance;
  }

  private loadConfig(): void {
    if (!fs.existsSync(this.configFilePath)) {
      this.initializeConfig();
    } else {
      const data = fs.readFileSync(this.configFilePath, 'utf8');
      this.registrations = JSON.parse(data);
    }
  }

  private initializeConfig(): void {
    this.registrations = [
		// {
		// 	elementType: 'function',
		// 	objectName: 'generate unit tests',
		// 	promptGenerator: '/test generate unit tests for {__filename__} {__functionName__}'
		// },
		// {
		// 	elementType: 'inner_function',
		// 	objectName: 'generate comment',
		// 	promptGenerator: 'generate comment for \n ```code\n{__functionCode__}\n```\n'
		// },
		// {
		// 	elementType: 'function',
		// 	objectName: 'generate comment',
		// 	promptGenerator: 'generate comment for \n ```code\n{__functionCode__}\n```\n'
		// }
	];
    this.saveConfig();
  }

  private saveConfig(): void {
    const configDir = path.dirname(this.configFilePath);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    fs.writeFileSync(this.configFilePath, JSON.stringify(this.registrations, null, 2), 'utf8');
  }

  public getRegistrations(): CodeLensRegistration[] {
	return this.registrations;
  }
}


async function getFunctionDefinitions(document: vscode.TextDocument, inner_function: boolean = false): Promise<FunctionDefinition[]> {
	const symbols: vscode.DocumentSymbol[] | undefined = await vscode.commands.executeCommand(
		'vscode.executeDocumentSymbolProvider',
		document.uri
	);

	if (!symbols) {
		return [];
	}

	function extractFunctions(symbol: vscode.DocumentSymbol, containerName: string | null, hasInFunction: boolean = false): FunctionDefinition[] {
		console.log('==> symbol range:', symbol.range, symbol.name, symbol.kind);
		let functions: FunctionDefinition[] = [];
		if (symbol.kind === vscode.SymbolKind.Function || symbol.kind === vscode.SymbolKind.Method) {
			if (!inner_function || (inner_function && hasInFunction)) {
				functions.push({
					name: symbol.name,
					containerName: containerName,
					range: symbol.range
				});
			}
			hasInFunction = true;
		}

		if (inner_function) {
			if (symbol.children && symbol.children.length > 0) {
				symbol.children.forEach(child => {
					functions = functions.concat(extractFunctions(child, symbol.name, hasInFunction));
				});
			}
		}
		
		return functions;
	}

	let functionSymbols: FunctionDefinition[] = [];
	symbols.forEach(symbol => {
		functionSymbols = functionSymbols.concat(extractFunctions(symbol, null));
	});

	return functionSymbols;
}



class FunctionTestCodeLensProvider implements vscode.CodeLensProvider {
    // The provideCodeLenses method should have the correct signature
    async provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken): Promise<vscode.CodeLens[]> {
        const lenses: vscode.CodeLens[] = [];
		const functionDefinitions = await getFunctionDefinitions(document);
		const innerFunctionDefinitions = await getFunctionDefinitions(document, true);

		const matchElements = {
			'function': functionDefinitions,
			'inner_function': innerFunctionDefinitions
		};

		for (const [elementType, elements] of Object.entries(matchElements)) {
			elements.forEach((funcDef) => {
				const range = new vscode.Range(
					new vscode.Position(funcDef.range.start.line, 0),
					new vscode.Position(funcDef.range.end.line, 10000)
				);

				const codelenRegisters: CodeLensRegistration[] = CodeLensManager.getInstance().getRegistrations();
				// Iterate over codelenRegisters with 'of' instead of 'in'
				for (const codelenRegister of codelenRegisters) {
					if (codelenRegister.elementType !== elementType) {
						continue;
					}

					// Read range content in document
					const functionCode = document.getText(range);

					// Fix the string replacement syntax and closing parentheses
					const prompt = codelenRegister.promptGenerator
						.replace('{__filename__}', document.uri.fsPath)
						.replace('{__functionName__}', funcDef.name)
						.replace('{__functionRange__}', `[${range.start.line}, ${range.end.line}]`)
						.replace('{__functionCode__}', functionCode); // Fixed syntax

					const lens = new vscode.CodeLens(range, {
						title: codelenRegister.objectName,
						command: "DevChat.Chat",
						// arguments: [document.uri.fsPath, range, funcDef.name] // Commented out as it's not used
						arguments: [prompt]
					});

					lenses.push(lens);
				}
			});
		}

        return lenses;
    }
}


export function registerCodeLensProvider(context) {
	const provider = new FunctionTestCodeLensProvider();
	const disposable = vscode.languages.registerCodeLensProvider("*", provider);

	context.subscriptions.push(disposable);
}
