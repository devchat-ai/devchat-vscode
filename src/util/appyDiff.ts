import { logger } from "./logger";


type Action = {
	action: "delete" | "insert" | "modify";
	content?: string;
	insert_after?: string;
	original_content?: string;
	new_content?: string;
};

function findMatchingIndex(list1: string[], list2: string[]): number {
	for (let i = 0; i <= list1.length - list2.length; i++) {
		let isMatch = true;
		for (let j = 0; j < list2.length; j++) {
			if (list1[i + j].trim() !== list2[j].trim()) {
				isMatch = false;
				break;
			}
		}
		if (isMatch) {
			return i;
		}
	}
	return -1;
}

export function applyCodeChanges(originalCode: string, actionsString: string): string {
	const actions = JSON.parse(actionsString) as Array<Action>;

	const lines = originalCode.split('\n');

	for (const action of actions) {
		const contentLines = action.content?.split('\n') || [];
		const insertAfterLines = action.insert_after?.split('\n') || [];
		const originalContentLines = action.original_content?.split('\n') || [];

		switch (action.action) {
			case 'delete':
				// find the matching index
				const matchingIndex = findMatchingIndex(lines, contentLines);
				if (matchingIndex !== -1) {
					lines.splice(matchingIndex, contentLines.length);
				}
				break;

			case 'insert':
				// find the matching index
				const matchingIndex2 = findMatchingIndex(lines, insertAfterLines);
				if (matchingIndex2 !== -1) {
					lines.splice(matchingIndex2 + 1, 0, ...contentLines);
				}
				break;

			case 'modify':
				// find the matching index
				const matchingIndex3 = findMatchingIndex(lines, originalContentLines);
				if (matchingIndex3 !== -1) {
					lines.splice(matchingIndex3, originalContentLines.length, ...action.new_content!.split('\n'));
				}
				break;
		}
	}

	return lines.join('\n');
}


export function isValidActionString(actionString: string): boolean {
	try {
		const actions = JSON.parse(actionString) as Array<Action>;

		for (const action of actions) {
			if (!["delete", "insert", "modify"].includes(action.action)) {
				return false;
			}

			if (action.action === "delete" && !action.content) {
				logger.channel()?.error(`Invalid action string: ${action}`);
				return false;
			}

			if (action.action === "insert" && (!action.content || !action.insert_after)) {
				logger.channel()?.error(`Invalid action string: ${action}`);
				return false;
			}

			if (action.action === "modify" && (!action.original_content || !action.new_content)) {
				logger.channel()?.error(`Invalid action string: ${action}`);
				return false;
			}
		}

		return true;
	} catch (error) {
		return false;
	}
}