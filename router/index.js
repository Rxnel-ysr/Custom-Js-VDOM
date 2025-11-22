import { create } from "../DSL-DOM/core/router.js";
import { createVNode, registerCustomVdom } from "../DSL-DOM/core/vdom.js";

const appRouter = create({
    prefix: '',
    titleId: 'title',
    routes: [
    ]
})

registerCustomVdom('routerLink', (props = {}, ...children) => {
    let destination = props?.to || ''
    let scroll = props?.scrollTo || ''
    let finalDestination = props.href = `${destination}${scroll}`

    delete props.to
    delete props.scrollTo

    return createVNode('a', {
        ...props, onclick: (e) => {
            e.preventDefault()
            let current = currentUri()
            // console.log("hm");

            if (destination) {
                // console.log("hm a");
                appRouter.go(finalDestination);
            }
            // console.log(to.lastIndexOf('#'));
            if (scroll) {
                if (current === destination) {
                    appRouter.scrollToHash(scroll);
                } else {
                    pushJob(() => {
                        // console.log("hm b");
                        appRouter.scrollToHash(scroll);
                    })
                }
            }
        }
    }, children)
})

export default appRouter;