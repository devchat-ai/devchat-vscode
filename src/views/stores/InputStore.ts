import { types, flow, Instance } from "mobx-state-tree";
import messageUtil from '@/util/MessageUtil';
import { IMessage } from '@/views/stores/ChatStore';

interface Item {
    name: string;
    pattern: string;
    description: string;
}

const regContextMenus = async () => {
    return new Promise<Item[]>((resolve, reject) => {
        try {
            messageUtil.sendMessage({ command: 'regContextList' });
            messageUtil.registerHandler('regContextList', (message: { result: Item[] }) => {
                resolve(message.result);
            });
        } catch (e) {
            reject(e);
        }
    });
};
const regModelMenus = async () => {
    return new Promise<String[]>((resolve, reject) => {
        try {
            messageUtil.sendMessage({ command: 'regModelList' });
            messageUtil.registerHandler('regModelList', (message: {result: String[]} ) => {
                resolve(message.result);
            });
        } catch (e) {
            reject(e);
        }
    });
};

export const ChatContext = types.model({
    file: types.maybe(types.string),
    path: types.maybe(types.string),
    command: types.maybe(types.string),
    content: types.string
});

export const MenuItem = types.model({
    icon: types.maybe(types.string),
    name: types.string,
    pattern: types.maybe(types.string),
    description: types.string
});

export const InputStore = types
    .model("Input", {
        value: "",
        contexts: types.array(ChatContext),
        menuType: "contexts",
        menuOpend: false,
        currentMenuIndex: 0,
        commandMenus: types.array(MenuItem),
        contextMenus: types.array(MenuItem),
        modelMenus: types.array(types.string)
    }).
    actions(self => ({
        setValue(value: string) {
            self.value = value;
        },
        removeContext(index: number) {
            self.contexts.splice(index, 1);
        },
        clearContexts() {
            self.contexts.clear();
        },
        setContexts(contexts: IChatContext[]) {
            self.contexts.clear();
            contexts?.forEach(context => {
                self.contexts.push({ ...context });
            });
        },
        newContext(context: IChatContext) {
            self.contexts.push(context);
        },
        openMenu(menuType: string) {
            self.menuOpend = true;
            self.menuType = menuType;
        },
        closeMenu() {
            self.menuOpend = false;
            self.menuType = '';
        },
        setCurrentMenuIndex(index: number) {
            self.currentMenuIndex = index;
        },
        updateCommands(items) {
            self.commandMenus.clear();
			self.commandMenus.push(...items);
			self.commandMenus.push({ name: 'help', description: 'View the DevChat documentation.', pattern: 'help' });
        },
        fetchContextMenus: flow(function* () {
            try {
                const items = yield regContextMenus();
                self.contextMenus.push(...items);
            } catch (error) {
                console.error("Failed to fetch context menus", error);
            }
        }),
        fetchModelMenus: flow(function* () {
            try {
                const models = yield regModelMenus();
                self.modelMenus.push(...models);
            } catch (error) {
                console.error("Failed to fetch context menus", error);
            }
        }),
        fetchCommandMenus: flow(function* () {
			const regCommandMenus = async () => {
				return new Promise<Item[]>((resolve, reject) => {
					try {
						messageUtil.sendMessage({ command: 'regCommandList' });
					} catch (e) {
						reject(e);
					}
				});
			};

			try {
				yield regCommandMenus();
			} catch (error) {
				console.error("Failed to fetch command menus", error);
			}
		}),
    }));


export type IInputStore = Instance<typeof InputStore>;
export type IChatContext = Instance<typeof ChatContext>;