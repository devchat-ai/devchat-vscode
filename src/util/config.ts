import fs from 'fs';
import yaml from 'yaml';
import path from 'path';
import { logger } from './logger';


export class DevChatConfig {
    private static instance: DevChatConfig;
    // 配置文件路径，根据操作系统的差异，可能需要调整
    private configFilePath: string;
    private data: any;
    // last modify timestamp of the config file
    private lastModifyTime: number;

    private constructor() {
        // 视操作系统的差异，可能需要调整路径 ~/.chat/config.yml
        this.configFilePath = path.join(process.env.HOME || process.env.USERPROFILE || '', '.chat', 'config.yml');
        this.lastModifyTime = 0;
        this.readConfigFile();
    }

    public static getInstance(): DevChatConfig {
        if (!DevChatConfig.instance) {
            DevChatConfig.instance = new DevChatConfig();
        }
        return DevChatConfig.instance;
    }

    private readConfigFile() {
        try {
            // if config file not exist, create a empty file
            if (!fs.existsSync(this.configFilePath)) {
                fs.mkdirSync(path.dirname(this.configFilePath), { recursive: true });
                fs.writeFileSync(this.configFilePath, '', 'utf8');
            }

            const fileContents = fs.readFileSync(this.configFilePath, 'utf8');
            this.data = yaml.parse(fileContents) ?? {};
            this.lastModifyTime = fs.statSync(this.configFilePath).mtimeMs;
        } catch (error) {
			logger.channel()?.error(`Error reading the config file: ${error}`);
            logger.channel()?.show();
            this.data = {};
        }
    }

    private writeConfigFile() {
        try {
            const yamlStr = yaml.stringify(this.data);
            fs.writeFileSync(this.configFilePath, yamlStr, 'utf8');
        } catch (error) {
            logger.channel()?.error(`Error writing the config file: ${error}`);
            logger.channel()?.show();
        }
    }

    public get(key: string | string[], defaultValue: any = undefined): any {
        // check if the config file has been modified
        const currentModifyTime = fs.statSync(this.configFilePath).mtimeMs;
        if (currentModifyTime > this.lastModifyTime) {
            this.readConfigFile();
        }

        let keys: string[] = [];

        if (typeof key === 'string') {
            keys = key.split('.');
        } else {
            keys = key;
        }

        let value = this.data;
        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                // If the key is not found or value is not an object, return the default value
                return defaultValue || undefined;
            }
        }

        return value;
    }

    public set(key: string | string[], value: any): void {
        let keys: string[] = [];

        if (typeof key === 'string') {
            keys = key.split('.');
        } else {
            keys = key;
        }
        
        let lastKey = keys.pop();
        let lastObj = keys.reduce((prev, k) => {
            if (!prev[k]) {
                prev[k] = {};
            }
            return prev[k];
        }, this.data); // 这创建一个嵌套的对象结构，如果不存在的话
        if (lastKey) {
            lastObj[lastKey] = value; // 设置值
        }
        this.writeConfigFile(); // 更新配置文件
    }

    public getAll(): any {
        // check if the config file has been modified
        const currentModifyTime = fs.statSync(this.configFilePath).mtimeMs;
        if (currentModifyTime > this.lastModifyTime) {
            this.readConfigFile();
        }

        return this.data;
    }

    public setAll(newData: any): void {
        this.data = newData;
        this.writeConfigFile(); // 更新配置文件
    }
}