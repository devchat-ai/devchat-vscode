import fs from 'fs';
import path from 'path';
import { logger } from '../util/logger';

export interface Action {
    name: string;
    description: string;
    type: string[];
    action: string;
    handler: string[];
}

export class CustomActions {
    private static instance: CustomActions | null = null;
    private actions: Action[] = [];

    private constructor() {
    }

    public static getInstance(): CustomActions {
        if (!CustomActions.instance) {
            CustomActions.instance = new CustomActions();
        }
        return CustomActions.instance;
    }

    public parseActions(workflowsDir: string): void {
        this.actions = [];

        try {
            const extensionDirs = fs.readdirSync(workflowsDir, { withFileTypes: true })
                .filter(dirent => dirent.isDirectory())
                .map(dirent => dirent.name);

            for (const extensionDir of extensionDirs) {
                const actionDir = path.join(workflowsDir, extensionDir, 'action');
                if (fs.existsSync(actionDir)) {
                    const actionSubDirs = fs.readdirSync(actionDir, { withFileTypes: true })
                        .filter(dirent => dirent.isDirectory())
                        .map(dirent => dirent.name);

                    for (const actionSubDir of actionSubDirs) {
                        const settingsPath = path.join(actionDir, actionSubDir, '_setting_.json');
                        if (fs.existsSync(settingsPath)) {
                            const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
                            const action: Action = {
                                name: settings.name,
                                description: settings.description,
                                type: settings.type,
                                action: settings.action,
                                handler: settings.handler.map((handler: string) => handler.replace('${CurDir}', path.join(actionDir, actionSubDir)))
                            };
                            this.actions.push(action);
                        }
                    }
                }
            }
        } catch (error) {
            // Show error message
            logger.channel()?.error(`Failed to parse actions: ${error}`);
			logger.channel()?.show();
		}
	}

	public getActions(): Action[] {
		return this.actions;
	}
}