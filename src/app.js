// App.js
import { html } from "../core/vdom.old.js";
import { comp, useState } from "../core/vdom.hooks.js";
import Router from "../router/index.js";

const combA = () => {
    let [a, setA] = useState("INI A")
    return html.div({}, html.input({ type: "text", oninput: (e) => setA(e.target.value), value: a }), `${a}`)
}

const combB = () => {
    let [b, setB] = useState("INI B")
    let [c, setC] = useState("INI C")

    return html.p({}, `${b} | ${c}`)
}

const App = () => {
    let [toggle, setToggle] = useState(true);
    // console.log(Router.routerView())

    return html.div({},
        html.button(
            { onclick: () => setToggle(a => !a) },
            "Ubah"),
        Router.routerView(),
        toggle ? comp(combA) : comp(combB),

        html.button({ onclick: () => Router.go('/test') }, "Go to test"),
        html.button({ onclick: () => Router.go('/compB') }, "Go to compB"),

    )

}


export default App;