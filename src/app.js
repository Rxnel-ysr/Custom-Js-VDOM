// App.js
import { html } from "../DSL-DOM/core/vdom.js";
import { useState } from "../DSL-DOM/core/vdom.hooks.js";

const App = () => {
    const [counter, setCounter] = useState(0);

    return html.div({
        style: {
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '1rem'
        }
    }, [
        html.h1(`${counter}`),
        html.br(),
        html.button({ onclick: () => setCounter(i => i + 1) }, "Add")
    ])
}

export default App;