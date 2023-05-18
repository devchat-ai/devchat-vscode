import { logger } from "./logger";




type Action = {
	action: "delete" | "insert" | "modify";
	content?: string;
	insert_after?: string;
	original_content?: string;
	new_content?: string;
};

export function applyCodeChanges(originalCode: string, actionsString: string): string {
    const actions = JSON.parse(actionsString) as Array<Action>;

    const lines = originalCode.split('\n');

    for (const action of actions) {
        const contentLines = action.content?.split('\n') || [];
        const insertAfterLines = action.insert_after?.split('\n') || [];
        const originalContentLines = action.original_content?.split('\n') || [];

        switch (action.action) {
            case 'delete':
                const deleteIndices = lines.reduce((indices, line, index) => {
                    if (contentLines.includes(line.trim())) {
                        indices.push(index);
                    }
                    return indices;
                }, [] as number[]);
                for (const deleteIndex of deleteIndices.reverse()) {
                    lines.splice(deleteIndex, contentLines.length);
                }
                break;

            case 'insert':
                const insertIndices = lines.reduce((indices, line, index) => {
                    if (insertAfterLines.includes(line.trim())) {
                        indices.push(index);
                    }
                    return indices;
                }, [] as number[]);
                for (const insertIndex of insertIndices.reverse()) {
                    lines.splice(insertIndex + 1, 0, ...contentLines);
                }
                break;

            case 'modify':
                const modifyIndices = lines.reduce((indices, line, index) => {
                    if (originalContentLines.includes(line.trim())) {
                        indices.push(index);
                    }
                    return indices;
                }, [] as number[]);
                for (const modifyIndex of modifyIndices) {
                    lines.splice(modifyIndex, originalContentLines.length, ...action.new_content!.split('\n'));
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