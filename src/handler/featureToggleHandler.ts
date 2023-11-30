/*
check whether some feature is enabled
*/

import * as vscode from 'vscode';
import { regInMessage, regOutMessage } from '../util/reg_messages';
import { logger } from '../util/logger';
import { FT, FTs } from '../util/feature_flags/feature_toggles';
import { MessageHandler } from './messageHandler';

regInMessage({command: 'featureToggle', feature: 'feature name'});
regOutMessage({command: 'featureToggle', feature: 'feature name', enabled: true});
export async function featureToggle(message: any, panel: vscode.WebviewPanel|vscode.WebviewView): Promise<void> {
    const enabled = FT(message.feature);
	MessageHandler.sendMessage(panel, {command: 'featureToggle', feature: message.feature, enabled: enabled});
}

regInMessage({command: 'featureToggles'});
regOutMessage({command: 'featureToggles', features: {'feature name': true}});
export async function getFeatureToggles(message: any, panel: vscode.WebviewPanel|vscode.WebviewView): Promise<void> {
    const featureTaggles = FTs();
	MessageHandler.sendMessage(panel, {command: 'featureToggles', features: featureTaggles});
}