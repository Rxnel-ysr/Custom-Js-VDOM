// App.js
import { html } from "../core/vdom.js";
import { comp, useState } from "../core/vdom.hooks.js";
import Router from "../router/index.js";
import compB from "./components/compB.js";

const combA = () => {
    let [a, setA] = useState("INI A")
    return html.div({}, html.input({ type: "text", oninput: (e) => setA(e.target.value), value: a }), `${a}`)
}

const App = () => {
    let [toggle, setToggle] = useState(true);
    // console.log(Router.routerView())

    return html.div({},
        html.button(
            { onclick: () => setToggle(a => !a) },
            "Ubah"),
        Router.routerView(),
        toggle ? comp(combA) : comp(compB),
        comp(compB),

        html.button({ onclick: () => Router.go('/test') }, "Go to test"),
        html.button({ onclick: () => Router.go('/compB') }, "Go to compB"),

    )

}


export default App;