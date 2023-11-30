import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

const featureTogglesJson = `
{
	"ask-code-summary": false,
	"ask-code": true,
	"ask-code-dfs": false
}`;
const featureToggles = JSON.parse(featureTogglesJson);


// eslint-disable-next-line @typescript-eslint/naming-convention
export function FT(feature: string): boolean {
    const betaInvitationCode = vscode.workspace.getConfiguration('DevChat').get<string>('betaInvitationCode');
    const expectedInvitationCode = 'WELCOMEADDTODEVCHAT';

    return betaInvitationCode === expectedInvitationCode || featureToggles[feature] === true;
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export function FTs(): any {
	// visited features
	let newFeatureToggles = {};
	for (const feature in featureToggles) {
		newFeatureToggles[feature] = FT(feature);
	}
	return newFeatureToggles;
}