import { createRoot } from "./core/vdom.hooks.js";
import { include } from "./mics/importCss.js";
import Router from './core/router.js'
import App from "./src/app.js";
import env from './env.json' with {type: 'json'}

(async () => {
    include('./style/index.css')
})();

let app = createRoot(App, "#app", "App");
Router.init()

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
