/*
 不同源码语言有不同语法信息，例如注释标记。
*/

export const supportedLanguages: { [key: string]: string } = {
    bash: "bash",  // tree-sitter-bash.wasm
    sh: "bash",    // tree-sitter-bash.wasm
    c: "c",        // tree-sitter-c.wasm
    h: "c",        // tree-sitter-c.wasm
    cs: "c_sharp", // tree-sitter-c_sharp.wasm
    cpp: "cpp",    // tree-sitter-cpp.wasm
    hpp: "cpp",    // tree-sitter-cpp.wasm
    cc: "cpp",     // tree-sitter-cpp.wasm
    cxx: "cpp",    // tree-sitter-cpp.wasm
    hxx: "cpp",    // tree-sitter-cpp.wasm
    cp: "cpp",     // tree-sitter-cpp.wasm
    hh: "cpp",     // tree-sitter-cpp.wasm
    inc: "cpp",    // tree-sitter-cpp.wasm
    css: "css",    // tree-sitter-css.wasm
    elm: "elm",    // tree-sitter-elm.wasm
    el: "elisp",   // tree-sitter-elisp.wasm
    emacs: "elisp",// tree-sitter-elisp.wasm
    ex: "elixir",  // tree-sitter-elixir.wasm
    exs: "elixir", // tree-sitter-elixir.wasm
    eex: "embedded_template",    // tree-sitter-embedded_template.wasm
    heex: "embedded_template",   // tree-sitter-embedded_template.wasm
    leex: "embedded_template",   // tree-sitter-embedded_template.wasm
    go: "go",       // tree-sitter-go.wasm
    html: "html",   // tree-sitter-html.wasm
    htm: "html",    // tree-sitter-html.wasm
    java: "java",   // tree-sitter-java.wasm
    ts: "typescript",  // tree-sitter-typescript.wasm
    mts: "typescript", // tree-sitter-typescript.wasm
    cts: "typescript", // tree-sitter-typescript.wasm
    js: "javascript",  // tree-sitter-javascript.wasm
    jsx: "javascript", // tree-sitter-javascript.wasm
    mjs: "javascript", // tree-sitter-javascript.wasm
    cjs: "javascript", // tree-sitter-javascript.wasm
    json: "json",      // tree-sitter-json.wasm
    kt: "kotlin",      // tree-sitter-kotlin.wasm
    lua: "lua",        // tree-sitter-lua.wasm
                    // tree-sitter-objc.wasm
    ocaml: "ocaml", // tree-sitter-ocaml.wasm
    ml: "ocaml",    // tree-sitter-ocaml.wasm
    mli: "ocaml",   // tree-sitter-ocaml.wasm
    php: "php",     // tree-sitter-php.wasm
    phtml: "php",   // tree-sitter-php.wasm
    php3: "php",    // tree-sitter-php.wasm
    php4: "php",    // tree-sitter-php.wasm
    php5: "php",    // tree-sitter-php.wasm
    php7: "php",    // tree-sitter-php.wasm
    phps: "php",    // tree-sitter-php.wasm
    "php-s": "php", // tree-sitter-php.wasm
    py: "python",   // tree-sitter-python.wasm
    pyw: "python",  // tree-sitter-python.wasm
    pyi: "python",  // tree-sitter-python.wasm
    ql: "ql",       // tree-sitter-ql.wasm
    res: "rescript",   // tree-sitter-rescript.wasm
    resi: "rescript",  // tree-sitter-rescript.wasm
    rb: "ruby",        // tree-sitter-ruby.wasm
    erb: "ruby",       // tree-sitter-ruby.wasm
    rs: "rust",        // tree-sitter-rust.wasm
    scala: "scala",    // tree-sitter-scala.wasm
    swift: "swift",    // tree-sitter-swift.wasm
    rdl: "systemrdl",  // tree-sitter-systemrdl.wasm
    toml: "toml",      // tree-sitter-toml.wasm
    tsx: "tsx",        // tree-sitter-tsx.wasm
    vue: "vue",        // tree-sitter-vue.wasm
};

  
// tree-sitter tag to find funtions
const LANG_CONFIG = {
    "cpp": {
        "commentPrefix": "//",
        "endOfLine": [";", ",", ")", "}", "]"],
    },
    "python": {
        "commentPrefix": "#",
        "endOfLine": [",", ")", "}", "]"],
    },
    "javascript": {
        "commentPrefix": "//",
        "endOfLine": [";", ",", ")", "}", "]"],
    },
    "typescript": {
        "commentPrefix": "//",
        "endOfLine": [";", ",", ")", "}", "]"],
    },
    "java": {
        "commentPrefix": "//",
        "endOfLine": [";", ",", ")", "}", "]"],
    },
    "c_sharp": {
        "commentPrefix": "//",
        "endOfLine": [";", ",", ")", "}", "]"],
    },
    "go": {
        "commentPrefix": "//",
        "endOfLine": [",", ")", "}", "]"],
    },
    "rust": {
        "commentPrefix": "//",
        "endOfLine": [";", ",", ")", "}", "]"],
    },
    "dart": {
        "commentPrefix": "//",
        "endOfLine": [";", ",", ")", "}", "]"],
    },
};


export interface LanguageFunctionsConfig {
    parent: string,
    body: string
}

export async function getLanguageFullName(filepath: string): Promise<string | undefined> {
    const extension = filepath.split('.').pop() || '';
    return supportedLanguages[extension];
}

export async function getLangageFunctionConfig(filepath: string): Promise<LanguageFunctionsConfig[]> {
    const extension = filepath.split('.').pop() || '';
    const extensionLang = supportedLanguages[extension];
    if (!extensionLang) {
        return [];
    }

    if (!LANG_CONFIG[extensionLang]) {
        return [];
    }
    return LANG_CONFIG[extensionLang]["functions"];
}

export async function getCommentPrefix(filepath: string): Promise<string> {
    const extension = filepath.split('.').pop() || '';
    const extensionLang = supportedLanguages[extension];
    if (!extensionLang) {
        return "//";
    }

    if (!LANG_CONFIG[extensionLang]) {
        return "//";
    }
    return LANG_CONFIG[extensionLang]["commentPrefix"];
}

export async function getEndOfLine(filepath: string): Promise<string[]> {
    const extension = filepath.split('.').pop() || '';
    const extensionLang = supportedLanguages[extension];
    if (!extensionLang) {
        return [];
    }

    if (!LANG_CONFIG[extensionLang]) {
        return [];
    }
    return LANG_CONFIG[extensionLang]["endOfLine"];
}