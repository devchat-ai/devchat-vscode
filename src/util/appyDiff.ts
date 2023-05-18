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
        switch (action.action) {
            case 'delete':
                const deleteIndex = lines.findIndex(line => line.trim() === action.content);
                if (deleteIndex !== -1) {
                    lines.splice(deleteIndex, 1);
                }
                break;

            case 'insert':
                const insertIndex = lines.findIndex(line => line.trim() === action.insert_after);
                if (insertIndex !== -1) {
                    lines.splice(insertIndex + 1, 0, action.content!);
                }
                break;

            case 'modify':
                const modifyIndex = lines.findIndex(line => line.trim() === action.original_content);
                if (modifyIndex !== -1) {
                    lines[modifyIndex] = lines[modifyIndex].replace(lines[modifyIndex].trim(), action.new_content!);
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