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
                const deleteRegex = new RegExp(action.content!.replace(/\n/g, '\\n'), 'g');
                originalCode = originalCode.replace(deleteRegex, '');
                break;

            case 'insert':
                const insertRegex = new RegExp(action.insert_after!.replace(/\n/g, '\\n'), 'g');
                originalCode = originalCode.replace(insertRegex, `${action.insert_after}\n${action.content}`);
                break;

            case 'modify':
                const modifyRegex = new RegExp(action.original_content!.replace(/\n/g, '\\n'), 'g');
                originalCode = originalCode.replace(modifyRegex, action.new_content!);
                break;
        }
    }

    return originalCode;
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