"use strict";
import env from /** Skip */ '../../env.json' with {type: 'json'}

/**
 * 
 * @param {String} uri
 * @return url
 */
const file = (uri) => {
    let res = '';
    if (env.deploy) {
        res = `${window.location.origin}/Baria/${uri}`
    } else {
        res = `${window.location.origin}/${uri}`

    }
    return res;
}

/**
 * 
 * @param {String} string 
 * @param {String} character 
 */
const ltrim = (string, character) => {
    let cutted = 0;

    while (string[cutted] == character) {
        cutted++
    }

    return string.slice(cutted)
}

/**
 * 
 * @param {String} string 
 * @param {String} character 
 */
const rtrim = (string, character) => {
    let lastIndex = string.length - 1;

    while (string[lastIndex] == character && lastIndex >= 0) {
        lastIndex--
    }

    return string.slice(0, lastIndex + 1)
}

/**
 * 
 * @param {String} string 
 * @param {String} character 
 */
const trim = (string, character) => rtrim(ltrim(string, character), character);


const currentUri = (withHash = false) => {
    let res = withHash ? `${window.location.pathname}${window.location.hash}` : window.location.pathname
    // console.log("CALLED", res);
    return res;
};

export { file, ltrim, rtrim, trim, currentUri }