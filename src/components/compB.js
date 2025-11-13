import { useState } from "../../DSL-DOM/core/vdom.hooks.js"
import { html } from "../../DSL-DOM/core/vdom.js"


const compB = () => {
    let [b, setB] = useState("INI OK")
    let [c, setC] = useState("INI ANK")

    return html.p({}, `${b} | ${c}`)
}


export default compB