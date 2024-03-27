import fs from 'fs';
import yaml from 'yaml';
import path from 'path';
import { logger } from './logger';


export class DevChatConfig {
    private configFilePath: string;
    private data: any;

    constructor() {
        // 视操作系统的差异，可能需要调整路径 ~/.chat/config.yml
        this.configFilePath = path.join(process.env.HOME || process.env.USERPROFILE || '', '.chat', 'config.yml');
        this.readConfigFile();
    }

    private readConfigFile() {
        try {
            const fileContents = fs.readFileSync(this.configFilePath, 'utf8');
            this.data = yaml.parse(fileContents);
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

    public get(key: string): any {
        return key.split('.').reduce((prev, curr) => prev ? prev[curr] : undefined, this.data);
    }

    public set(key: string, value: any): void {
        let keys = key.split('.');
        let lastKey = keys.pop();
        let lastObj = keys.reduce((prev, k) => prev[k] = prev[k] || {}, this.data); // 这创建一个嵌套的对象结构，如果不存在的话
        if (lastKey) {
            lastObj[lastKey] = value; // 设置值
        }
        this.writeConfigFile(); // 更新配置文件
    }

    public getAll(): any {
        return this.data;
    }

    public setAll(newData: any): void {
        this.data = newData;
        this.writeConfigFile(); // 更新配置文件
    }
}