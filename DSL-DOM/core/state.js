"use strict";
const StateCache = new Map();

export function getHooks(id) {
    return StateCache.get(id) || [];
}

export function setHooks(id, hooks) {
    StateCache.set(id, hooks);
}

export function clearHooks(id) {
    StateCache.delete(id);
}
