import * as vscode from "vscode";
import { logger } from "../util/logger";
import { ASSISTANT_NAME_ZH } from "../util/constants";
import { ExtensionContextHolder } from "../util/extensionContext";

interface FunctionDefinition {
  name: string;
  containerName: string | null;
  containerRange: vscode.Range | null;
  range: vscode.Range;
}

type CodeLensRegistration = {
  elementType: string;
  objectName: string;
  promptGenerator: string;
};

export class CodeLensManager {
  private static instance: CodeLensManager;
  private registrations: CodeLensRegistration[] = [
      {
        elementType: "function",
        objectName: `${ExtensionContextHolder.context?.extension.packageJSON.assistantNames.ASSISTANT_NAME_ZH}: unit tests`,
        promptGenerator:
          "/unit_tests {__filename__}:::{__functionName__}:::{__functionStartLine__}:::{__functionEndLine__}:::{__containerStartLine__}:::{__containerEndLine__}",
      },
      {
        elementType: "function",
        objectName: "explain",
        promptGenerator: "/explain",
      },
      {
        elementType: "function",
        objectName: "docstring",
        promptGenerator: "/docstring",
      },
    ];

  private constructor() {}

  public static getInstance(): CodeLensManager {
    if (!CodeLensManager.instance) {
      CodeLensManager.instance = new CodeLensManager();
    }
    return CodeLensManager.instance;
  }


  public getRegistrations(): CodeLensRegistration[] {
    return this.registrations;
  }
}

async function getFunctionDefinitions(
  document: vscode.TextDocument,
  inner_function: boolean = false
): Promise<FunctionDefinition[]> {
  const symbols: vscode.DocumentSymbol[] | undefined =
    await vscode.commands.executeCommand(
      "vscode.executeDocumentSymbolProvider",
      document.uri
    );

  if (!symbols) {
    return [];
  }

  function extractFunctions(
    symbol: vscode.DocumentSymbol,
    containerSymbol: vscode.DocumentSymbol | null,
    hasInFunction: boolean = false
  ): FunctionDefinition[] {
    let functions: FunctionDefinition[] = [];
    const isFunction =
      symbol.kind === vscode.SymbolKind.Function ||
      symbol.kind === vscode.SymbolKind.Method;
    if (isFunction) {
      if (!inner_function || (inner_function && hasInFunction)) {
        functions.push({
          name: symbol.name,
          containerName: containerSymbol ? containerSymbol.name : null,
          containerRange: containerSymbol ? containerSymbol.range : null,
          range: symbol.range,
        });
      }
      hasInFunction = true;
    }

    if (inner_function || !isFunction) {
      if (symbol.children && symbol.children.length > 0) {
        symbol.children.forEach((child) => {
          functions = functions.concat(
            extractFunctions(child, symbol, hasInFunction)
          );
        });
      }
    }

    return functions;
  }

  let functionSymbols: FunctionDefinition[] = [];
  symbols.forEach((symbol) => {
    functionSymbols = functionSymbols.concat(extractFunctions(symbol, null));
  });

  return functionSymbols;
}

class FunctionTestCodeLensProvider implements vscode.CodeLensProvider {
  // The provideCodeLenses method should have the correct signature
  async provideCodeLenses(
    document: vscode.TextDocument,
    token: vscode.CancellationToken
  ): Promise<vscode.CodeLens[]> {
    // check whether document is a source file
    if (document.languageId === "log") {
      return [];
    }
    const lenses: vscode.CodeLens[] = [];
    const functionDefinitions = await getFunctionDefinitions(document);
    const innerFunctionDefinitions = await getFunctionDefinitions(
      document,
      true
    );

    const matchElements = {
      function: functionDefinitions,
      inner_function: innerFunctionDefinitions,
    };

    for (const [elementType, elements] of Object.entries(matchElements)) {
      elements.forEach((funcDef) => {
        const range = new vscode.Range(
          new vscode.Position(funcDef.range.start.line, 0),
          new vscode.Position(funcDef.range.end.line, 10000)
        );

        const codelenRegisters: CodeLensRegistration[] =
          CodeLensManager.getInstance().getRegistrations();
        // Iterate over codelenRegisters with 'of' instead of 'in'
        for (const codelenRegister of codelenRegisters) {
          if (codelenRegister.elementType !== elementType) {
            continue;
          }

          // Read range content in document
          const functionCode = document.getText(range);
          const parentRange = funcDef.containerRange;

          // Fix the string replacement syntax and closing parentheses
          const prompt = codelenRegister.promptGenerator
            .replace(/{__filename__}/g, document.uri.fsPath)
            .replace(/{__functionName__}/g, funcDef.name)
            .replace(/{__functionStartLine__}/g, `${range.start.line}`)
            .replace(/{__functionEndLine__}/g, `${range.end.line}`)
            .replace(/{__containerName__}/g, funcDef.containerName || "")
            .replace(
              /{__containerStartLine__}/g,
              `${parentRange ? parentRange.start.line : -1}`
            )
            .replace(
              /{__containerEndLine__}/g,
              `${parentRange ? parentRange.end.line : -1}`
            )
            .replace(/{__functionCode__}/g, functionCode); // Fixed syntax to replace all occurrences
          if (
            codelenRegister.objectName === "explain" ||
            codelenRegister.objectName === "docstring"
          ) {
            const lens = new vscode.CodeLens(range, {
              title: codelenRegister.objectName,
              command: "CodeLens.Range",
              // arguments: [document.uri.fsPath, range, funcDef.name] // Commented out as it's not used
              arguments: [
                prompt,
                { start: range.start.line, end: range.end.line },
              ],
            });

            lenses.push(lens);
          } else {
            const lens = new vscode.CodeLens(range, {
              title: codelenRegister.objectName,
              command: "DevChat.Chat",
              // arguments: [document.uri.fsPath, range, funcDef.name] // Commented out as it's not used
              arguments: [prompt],
            });

            lenses.push(lens);
          }
        }
      });
    }

    // log info find how many functionDefinitions, innerFunctionDefinitions, lenses
    logger
      .channel()
      ?.trace(
        `found ${functionDefinitions.length} functions, ${innerFunctionDefinitions.length} inner functions, ${lenses.length} registered codeLenses in document: ${document.fileName}`
      );
    return lenses;
  }
}

export function registerCodeLensProvider(context) {
  const provider = new FunctionTestCodeLensProvider();
  const disposable = vscode.languages.registerCodeLensProvider("*", provider);

  context.subscriptions.push(disposable);
}
