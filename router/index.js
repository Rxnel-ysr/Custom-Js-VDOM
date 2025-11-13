import { create } from "../DSL-DOM/core/router.js";
import { createVNode, registerCustomVdom } from "../DSL-DOM/core/vdom.js";

const appRouter = create({
    prefix: '',
    titleId: 'title',
    routes: [
    ]
})

const scrollToHash = (hash) => {
    const el = document.querySelector(hash);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    history.replaceState(null, '', hash);
};

registerCustomVdom('routerLink', (props = {}, ...children) => {
    let destination = props?.to
    let scroll = props?.scrollTo

    delete props.to
    delete props.scrollTo

    return createVNode('a', {
        ...props, onclick: (e) => {
            e.preventDefault()
            if (destination) {
                appRouter.go(destination);
            }
            if (scroll) {
                scrollToHash(scroll);
            }
        }
    }, children)
})

export default appRouter;