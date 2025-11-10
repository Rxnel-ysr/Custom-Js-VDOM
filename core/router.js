import { setRegression, triggerRerender } from "./vdom.hooks.js";

const Router = {
    routes: {},
    errors: {},

    register: (uri, comp) => {
        Router.routes[uri] = comp
        return Router
    },

    go: (uri) => {
        if (uri !== location.pathname) {
            history.pushState({ path: uri }, "", uri)
            Router.trigger()
        }
    },

    error: (code, render) => {
        Router.errors[code] = render;
        return Router
    },

    routerView: (path = location.pathname) => {
        if (Router.routes[path]) return Router.routes[path]()
        else return Router.errors[404]()
    },

    init: () => {
        setRegression(true)
        Router.trigger = triggerRerender
        setRegression(false)
        // console.log("Okay");
    }
}

export default Router;