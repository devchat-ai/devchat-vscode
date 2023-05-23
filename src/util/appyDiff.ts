import { logger } from "./logger";


type Action = {
	action: "delete" | "insert" | "modify";
	content?: string;
	insert_after?: string;
	insert_before?: string;
	original_content?: string;
	new_content?: string;
};


function findMatchingIndex(list1: string[], list2: string[]): number[] {
	logger.channel()?.info(`findMatchingIndex start: ${list2.join('\n')}`);

	const matchingIndexes: number[] = [];
	for (let i = 0; i <= list1.length - list2.length; i++) {
		let isMatch = true;
		for (let j = 0; j < list2.length; j++) {
			if (list1[i + j].trim() !== list2[j].trim()) {
				if (j > 0) {
					logger.channel()?.info(`findMatchingIndex end at ${j} ${list1[i + j].trim()} != ${list2[j].trim()}`);
				}

				isMatch = false;
				break;
			}
		}
		if (isMatch) {
			matchingIndexes.push(i);
		}
	}

	logger.channel()?.info(`findMatchingIndex result: ${matchingIndexes.join(' ')}`);
	return matchingIndexes;
}

export function applyCodeChanges(originalCode: string, actionsString: string): string {
	const actions = JSON.parse(actionsString) as Array<Action>;

	const lines = originalCode.split('\n');
	// 构建与lines等长的数组，用于记录哪些行被修改过
	const modifiedIndexes: number[] = new Array(lines.length).fill(0);

	// 构建子函数，用于在多个匹配索引中找出最优的索引
	const findOptimalMatchingIndex = (matchingIndexList: number[]) => {
		// 优先找出未被修改过的索引
		const optimalMatchingIndex = matchingIndexList.find(index => modifiedIndexes[index] === 0);
		// 如果所有索引都被修改过，则找出第一个索引
		if (optimalMatchingIndex === undefined) {
			if (matchingIndexList.length > 0) {
				return matchingIndexList[0];
			} else {
				return undefined;
			}
		}
		return optimalMatchingIndex;
	};
	
	for (const action of actions) {
		const contentLines = action.content?.split('\n') || [];
		const insertAfterLines = action.insert_after?.split('\n') || [];
		const insertBeforeLines = action.insert_before?.split('\n') || [];
		const originalContentLines = action.original_content?.split('\n') || [];

		switch (action.action) {
			case 'delete':
				// find the matching index
				const matchingIndexList = findMatchingIndex(lines, contentLines);
				const optimalMatchingIndex = findOptimalMatchingIndex(matchingIndexList);
				if (matchingIndexList.length > 0) {
					if (optimalMatchingIndex !== undefined) {
						lines.splice(optimalMatchingIndex, contentLines.length);
						// 同步删除modifiedIndexes中记录
						modifiedIndexes.splice(optimalMatchingIndex, contentLines.length);
					}
				}
				break;
			case 'insert':
				// find the matching index
				if (insertBeforeLines.length > 0) {
					const matchingIndexList1 = findMatchingIndex(lines, insertBeforeLines);
					const optimalMatchingIndex1 = findOptimalMatchingIndex(matchingIndexList1);

					if (matchingIndexList1.length > 0) {
						if (optimalMatchingIndex1 !== undefined) {
							lines.splice(optimalMatchingIndex1, 0, ...contentLines);
							// 同步modifiedIndexes添加记录
							modifiedIndexes.splice(optimalMatchingIndex1, 0, ...new Array(contentLines.length).fill(1));
						}
					}
				}

				if (insertAfterLines.length > 0) {
					const matchingIndexList2 = findMatchingIndex(lines, insertAfterLines);
					const optimalMatchingIndex2 = findOptimalMatchingIndex(matchingIndexList2);

					if (matchingIndexList2.length > 0) {
						if (optimalMatchingIndex2 !== undefined) {
							lines.splice(optimalMatchingIndex2 + insertAfterLines.length, 0, ...contentLines);
							// 同步modifiedIndexes添加记录
							modifiedIndexes.splice(optimalMatchingIndex2 + insertAfterLines.length, 0, ...new Array(contentLines.length).fill(1));
						}
					}
				}
				break;
			case 'modify':
				// find the matching index
				const matchingIndexList3 = findMatchingIndex(lines, originalContentLines);
				const optimalMatchingIndex3 = findOptimalMatchingIndex(matchingIndexList3);

				if (matchingIndexList3.length > 0) {
					if (optimalMatchingIndex3 !== undefined) {
						lines.splice(optimalMatchingIndex3, originalContentLines.length, ...action.new_content!.split('\n'));
						// 同步modifiedIndexes添加记录
						modifiedIndexes.splice(optimalMatchingIndex3, originalContentLines.length, ...new Array(action.new_content!.split('\n').length).fill(1));
					}
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

			if (action.action === "insert" && (!action.content || (!action.insert_after && !action.insert_before))) {
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