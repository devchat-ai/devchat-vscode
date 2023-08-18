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


const regCommandMenus = async () => {
    return new Promise<Item[]>((resolve, reject) => {
        try {
            messageUtil.sendMessage({ command: 'regCommandList' });
            messageUtil.registerHandler('regCommandList', (message: { result: Item[] }) => {
                resolve(message.result);
            });
        } catch (e) {
            reject(e);
        }
    });
};

export const ChatContext = types.model({
    file: types.maybe(types.string),
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
        setContexts(contexts: IMessage['contexts']) {
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
        fetchContextMenus: flow(function* () {
            try {
                const items = yield regContextMenus();
                self.contextMenus.push(...items);
            } catch (error) {
                console.error("Failed to fetch context menus", error);
            }
        }),
        fetchCommandMenus: flow(function* () {
            try {
                const items = yield regCommandMenus();
                self.commandMenus.push(...items);
            } catch (error) {
                console.error("Failed to fetch command menus", error);
            }
        })
    }));


export type IInputStore = Instance<typeof InputStore>;
export type IChatContext = Instance<typeof ChatContext>;