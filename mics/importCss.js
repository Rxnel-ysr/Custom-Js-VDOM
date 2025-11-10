const include = async (filename) => {
    const style = document.createElement('link')
    style.rel = 'stylesheet'
    style.type = 'text/css'
    style.href = filename;
    document.head.appendChild(style)
}

export {include}