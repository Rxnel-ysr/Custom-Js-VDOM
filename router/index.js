import Router from "../core/router.js";
import { comp } from "../core/vdom.hooks.js";
import compB from "../src/components/compB.js";
import Test from "../src/components/test.js";

let setting = {
    routes: [
        {
            defaul: true,
            uri: '/test',
            component: () => comp(Test)
        },
        {
            uri: '/compB',
            component: () => comp(compB)
        }
    ]
}

Router.register('/test', () => comp(Test));
Router.register('/compB', () => comp(compB))
Router.error(404, () => comp(Test))

export default Router;