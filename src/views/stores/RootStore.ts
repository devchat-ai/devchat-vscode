import { Instance, onSnapshot, types } from "mobx-state-tree";
import { createContext, useContext } from "react";
import { InputStore } from "@/views/stores/InputStore";
import { ChatStore } from "@/views/stores/ChatStore";

const RootStore = types.model("Root", {
    input: InputStore,
    chat: ChatStore
});

export const rootStore = RootStore.create({
    input: InputStore.create(),
    chat: ChatStore.create()
});;

export type RootInstance = Instance<typeof RootStore>;
const RootStoreContext = createContext<null | RootInstance>(null);

export const Provider = RootStoreContext.Provider;

export function useMst() {
    const store = useContext(RootStoreContext);
    if (store === null) {
        throw new Error("Store cannot be null, please add a context provider");
    }
    return store;
}