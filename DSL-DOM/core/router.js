"use strict";
import { html } from "./vdom.js";

class Router {
    routes = {};
    errors = {};
    option = {
        prefix: "",
        default: null,
        titleId: null,
        titleEl: null,
    };

    /**
     * @template {{
     *  prefix: String|null,
     *  default: Function|null,
     *  routes: Array<{
     *      uri: String,
     *      title: String|null,
     *      component: Function
     *  }>
     * }} T
     *
     * @param {T} option
     */
    static make = (option = {}) => {
        return new Router(option);
    };

    /**
     *
     * @param {String} hash
     * @returns
     */
    scrollToHash = (hash) => {
        const el = document.querySelector(hash);
        if (!el) return;
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        history.replaceState(null, "", hash);
    };

    /**
     * @template {{
     *  prefix: String|null,
     *  default: Function|null,
     *  routes: Array<{
     *      uri: String,
     *      title: String|null,
     *      component: Function
     *  }>
     * }} T
     *
     * @param {T} option
     */
    constructor(option = {}) {
        this.option = option;
        if (Array.isArray(option?.routes)) {
            option.routes.forEach((route) => {
                this.register(route.uri, {
                    component: route.component,
                    title: route?.title,
                });
            });
        }
    }

    /**
     *
     * @param {String} uri
     * @param {() => Object} comp
     * @returns
     */
    register = (uri, comp) => {
        if (this.option?.prefix) {
            uri = `${this.option?.prefix}${uri}`;
            // console.log(uri);
        }
        this.routes[uri] = comp;
        return this;
    };

    /**
     *
     * @param {String} uri
     */
    go = (uri) => {
        // if (uri !== location.pathname) {
        // console.log("called")
        history.pushState({ path: uri }, "", uri);
        this.trigger();
        // }
    };

    /**
     *
     * @param {Object} [args={}]
     * @param {String} [path=location.pathname]
     * @returns {Object} Component
     */
    routerView = (args = {}, path = location.pathname) => {
        let route = this.routes[path];
        // console.log(path, route);
        if (route) {
            if (this.option?.titleId && route?.title) {
                if (!this.option?.titleEl) {
                    this.option.titleEl = document.getElementById(this.option.titleId);
                }
                this.option.titleEl.innerText = route.title;
            }
            // console.log(route.component(args))
            try {
                return route.component(args);
            } catch (error) {
                return html.p(`There was an error...: ${error}`);
            }
        } else if (typeof this.option?.default == "function") {
            return this.option.default();
        }
    };

    /**
     *
     * @param {Function} trigger Function to trigger reload
     */
    use = (trigger) => {
        // console.log(trigger);
        this.trigger = trigger;
    };
}

// console.log("HI");

const create = Router.make;

export { Router, create };
