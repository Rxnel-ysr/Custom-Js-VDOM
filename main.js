import { createRoot, triggerRerender } from "./DSL-DOM/core/vdom.hooks.js";
import App from "./src/app.js";
import env from './env.json' with {type: 'json'}
import appRouter from "./router/index.js";

let app = createRoot(App, "#app", "App");
appRouter.use(triggerRerender)
console.log(app);


if (env.hmr) {
    const socket = new WebSocket(`ws://${location.hostname}:${env.server}`);

    socket.addEventListener('message', async ({ data }) => {
        console.log('message was reciveed')
        const msg = JSON.parse(data);
        if (msg.type === 'reload') {
            try {
                console.log(`[HMR]: ${msg.path}`);
                const mod = await import(`./src/app.js?t=` + msg.timestamp);
                if (mod.default) {
                    app.setRenderFn(mod.default)
                    app.rerender();
                }
            } catch (error) {
                console.log(error);

            }

        }
    });

}