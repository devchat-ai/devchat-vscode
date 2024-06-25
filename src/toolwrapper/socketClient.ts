import { io, Socket } from "socket.io-client";
import { logger } from "../util/logger";

export let devchatSocket: Socket | null = null;

export function startSocketConn() {
    // socket = io("http://localhost:22222/", {
    //     transports: ["websocket"],
    // });
    devchatSocket = io("ws://localhost:22222/", {
        transports: ["websocket"],
        path: "/devchat.socket",
    });

    devchatSocket.on("connect", () => {
        logger
            .channel()
            ?.debug(`Connected to server with ID ${devchatSocket!.id}`);
        devchatSocket!.emit("chat_message", "Hello from ts Client");
    });

    devchatSocket.on("reply", (data) => {
        logger.channel()?.debug(`Received reply from server:\n${data}`);
    });

    devchatSocket.on("disconnect", () => {
        console.log("Disconnected from server");
        logger.channel()?.debug(`Disconnected from server`);
    });

    return devchatSocket;
}

export function closeSocketConn() {
    if (devchatSocket) {
        devchatSocket.disconnect();
        devchatSocket = null;
    }
}

