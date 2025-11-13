import { create } from "../DSL-DOM/core/router.js";
import { createVNode, registerCustomVdom } from "../DSL-DOM/core/vdom.js";

const appRouter = create({
    prefix: '',
    titleId: 'title',
    routes: [
    ]
})

const scrollToHash = (hash) => {
    // console.log(hash);
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
            // console.log("hm");


            if (destination) {
                // console.log("hm a");
                appRouter.go(destination);
            }
            // console.log(to.lastIndexOf('#'));
            if (scroll) {
                // console.log("hm b");
                scrollToHash(scroll);
            }
        }
    }, children)
})

export default appRouter;