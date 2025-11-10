import { useState } from "../../core/vdom.hooks.js"
import { html } from "../../core/vdom.old.js"

const compB = () => {
    let [b, setB] = useState("INI B")
    let [c, setC] = useState("INI C")

    return html.p({}, `${b} | ${c}`)
}


export default compB