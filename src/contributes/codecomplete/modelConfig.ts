

export interface ModelConfigTemplate {
    template: string;
    stop: string[];
}

const stableCodeTemplate: ModelConfigTemplate = {
    template: "<fim_prefix>{{{prefix}}}<fim_suffix>{{{suffix}}}<fim_middle>",
    stop: ["<fim_prefix>", "<fim_suffix>", "<fim_middle>", "<|endoftext|>"],
};

const MODLE_COMPLETE_CONFIG = {
    'starcoder': stableCodeTemplate,
    'starcoder2': stableCodeTemplate,
};

export function getModelConfigTemplate(modelName: string): ModelConfigTemplate | undefined {
    if (modelName in MODLE_COMPLETE_CONFIG) {
        return MODLE_COMPLETE_CONFIG[modelName];
    }
    return undefined;
}