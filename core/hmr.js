const socket = new WebSocket(`ws://${location.hostname}:3000`);
const handlers = new Map();

export function registerHMR(path, handler) {
    handlers.set(path, handler);
}

socket.onmessage = async ({ data }) => {
    const msg = JSON.parse(data);
    if (msg.type === "reload") {
        const path = msg.path;
        console.log(`[HMR] Hot reload: ${path}`);
        const handler = handlers.get(path);
        if (handler) {
            await handler();
        } else {
            console.warn(`[HMR] No handler for ${path}, fallback to full reload`);
            location.reload();
        }
    }
};

export async function hmr() {
    const mod = await import(`./src/app.js?t=${Date.now()}`);
    const NewApp = mod.default;
    console.log(mod);
    app = createComponent(NewApp, "#app", "App");
    location.reload()
}