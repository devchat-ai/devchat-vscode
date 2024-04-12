/*
 This file is copied from Continut repo.
 */

import { logger } from "../../../util/logger";
import { UiUtilWrapper } from "../../../util/uiUtil";
import * as path from "path";
import * as fs from "fs";
import { Language } from "web-tree-sitter";
import Parser = require("web-tree-sitter");
import { getLanguageFullName, supportedLanguages } from "./language";
import MemoryCacheManager from "../cache";


const parserCache: MemoryCacheManager = new MemoryCacheManager(4);
const langCache: MemoryCacheManager = new MemoryCacheManager(4);

export async function getParserForFile(filepath: string) {
    if (process.env.IS_BINARY) {
        return undefined;
    }

    try {
        const extension = filepath.split('.').pop() || '';
        const cachedParser = parserCache.get(extension);
        if (cachedParser) {
            return cachedParser;
        }

        await Parser.init({
            locateFile(filename) {
                if (filename === 'tree-sitter.wasm') {
                    // Return the path where you have placed the tree-sitter.wasm file
                    const wasmPath = path.join(
                        UiUtilWrapper.extensionPath(),
                        "tools",
                        "tree-sitter-wasms",
                        `tree-sitter.wasm`,
                    );
                    return wasmPath;
                }
                return filename;
            }
        });

        const language = await getLanguageForFile(filepath);
        if (!language) {
            return undefined;
        }

        const parser = new Parser();
        parser.setLanguage(language);

        parserCache.set(extension, parser);
        return parser;
    } catch (e) {
        logger.channel()?.error("Unable to load language for file", filepath, e);
        return undefined;
    }
}

export async function getLanguageForFile(
    filepath: string,
): Promise<Language | undefined> {
    try {
        await Parser.init();
        const extension = filepath.split('.').pop() || '';
        const cachedLang = langCache.get(extension);
        if (cachedLang) {
            return cachedLang;
        }

        if (!supportedLanguages[extension]) {
            return undefined;
        }

        const wasmPath = path.join(
            UiUtilWrapper.extensionPath(),
            "tools",
            "tree-sitter-wasms",
            `tree-sitter-${supportedLanguages[extension]}.wasm`,
        );
        if (!fs.existsSync(wasmPath)) {
            return undefined;
        }

        const language = await Parser.Language.load(wasmPath);

        langCache.set(extension, language);
        return language;
    } catch (e) {
        logger.channel()?.error("Unable to load language for file:", filepath, e);
        return undefined;
    }
}

export async function getQueryVariablesSource(filepath: string) {
    const fullLangName = await getLanguageFullName(filepath);
    if (!fullLangName) {
        return "";
    }
    const sourcePath = path.join(
        UiUtilWrapper.extensionPath(),
        "tools",
        "tree-sitter-queries",
        fullLangName,
        "variables.scm",
    );
    if (!fs.existsSync(sourcePath)) {
        return "";
    }
    return fs.readFileSync(sourcePath).toString();
}

export async function getQueryFunctionsSource(filepath: string) {
    const fullLangName = await getLanguageFullName(filepath);
    if (!fullLangName) {
        return "";
    }
    const sourcePath = path.join(
        UiUtilWrapper.extensionPath(),
        "tools",
        "tree-sitter-queries",
        fullLangName,
        "functions.scm",
    );
    if (!fs.existsSync(sourcePath)) {
        return "";
    }
    return fs.readFileSync(sourcePath).toString();
}
