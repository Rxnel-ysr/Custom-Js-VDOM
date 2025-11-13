/**
 * 
 * @param {String} uri
 * @return url
 */
const file = (uri) => {
    return `${window.location.origin}/${uri}`
}

export { file }