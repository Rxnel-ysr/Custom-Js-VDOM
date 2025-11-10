import { getHooks, setHooks } from './state.js';
import { RenderVDOM, getTarget } from './vdom.js';

let currentComponent = null,
    previewComponent = null,
    headPreview = previewComponent,
    regression = false

const resetContext = () => {
    currentComponent.hookNode = currentComponent.hooks;
};

const triggerRerender = () => {
    if (currentComponent) currentComponent.rerender()
}

const setRegression = (bool) => regression = bool

/**
 * Forgets the next n states in the hook chain
 * @param {number} [n=1] - Number of subsequent hook states to forget
 */
const forgot = (n = 1) => {
    if (!currentComponent) return;

    let hookNode = currentComponent.hookNode;
    if (!hookNode) return;

    // console.log(hookNode, 'Lo');
    for (let i = 1; i <= n && hookNode.next; i++) {
        delete hookNode.value
        hookNode = hookNode.next;
    }
    // currentComponent.hookNode = hookNode;
};

const resetPreview = () => {
    let current = headPreview

    while (current?.next) {
        current.value = undefined
        current = current.next
    }
}

const trailMaker = (n = 1) => {
    let head = { next: null }
    let node = head
    for (let i = 1; i <= n; i++) {
        node = node.next = { next: null }
    }

    return [head, node]
}

const allocate = (n) => {
    let start = currentComponent.hookNode
    // delete start.value
    // console.log("allocated", start);
    let [head, tail] = trailMaker(n - 1)

    tail.next = start.next
    start.next = head
    // console.log("allocated end", start);
}

const orphan = (n) => {
    let start = currentComponent.hookNode
    // delete start.value

    let end = start
    // console.log("orphaned", start);

    for (let i = 1; i <= n; i++) {
        end = end.next = end.next
    }

    start.next = end?.next || null

    // console.log("orphaned end", start);
}

const manageComponent = (compA, compB) => {
    let current = currentComponent.hookNode;
    // console.log("managed", current);

    if (compA.compHooks > compB.compHooks || compA.compHooks < compB.compHooks) {
        forgot(compA.compHooks)

        let n = 0, expected = current;

        while (n < compA.compHooks && expected) {
            expected = expected.next
            n++
        }

        let [start, obj] = trailMaker(compB.compHooks)


        while (n < compB.compHooks) {
            obj = obj.next = obj.next || { next: null }
            n++
        }

        let nextExpected = expected.next = expected.next || { next: null }
        obj.next = nextExpected
        current.next = start
        return compA
    } else if (compA.compHooks == compB.compHooks) {
        if (compA.stringified !== compB.stringified) {
            forgot(compA.compHooks)
        }

        return compA
    }

    return compA.vdom
};

const retainData = (nChild, vdom) => {
    if (!currentComponent) return;

    const hookNode = currentComponent.hookNode;
    if (!hookNode) return;

    const key = JSON.stringify(vdom);
    let n = 0;

    if (!hookNode.retained) hookNode.retained = { data: {} };
    if (!hookNode.retained.data[key]) hookNode.retained.data[key] = [];

    let current = hookNode.next;
    while (n < nChild && current) {
        hookNode.retained.data[key].push(current.value);
        current = current.next;
        n++;
    }
};

/**
 * Component wrapper that tracks hook usage count.
 *
 * @template {Record<string, any>} T
 * @template R
 * @param {(args: T) => R} compFn - Component function that receives args.
 * @param {T} [args={}] - Arguments passed to the component.
 * 
 * @returns {{
 *    render: () => R,
 *    compHooks: number,
 *    prev: any,
 *    next: any,
 *    isComp: true
 * }} Object containing information of the componennt.
 */
const comp = (compFn, args = {}) => {
    if (!previewComponent) return;
    // console.log(snapshot);

    const previewHook = previewComponent.previewHookNode;
    if (!previewHook) return;
    regression = true

    const vdom = compFn(args);

    regression = false
    const nextExpectedNode = previewComponent.previewHookNode;
    // console.log(snapshot);

    let current = previewHook;
    let counter = 0;

    while (current && current !== nextExpectedNode) {
        current = current.next;
        counter++;
    }

    let ok = {
        render: () => compFn(args),
        compHooks: counter,
        prev: previewHook,
        next: nextExpectedNode,
        vnode: vdom,
        stringified: JSON.stringify(vdom),
        isComp: true
    };
    // console.log(ok);
    return ok;
};


/**
 * Destroys all remaining hook states from current position to end of chain
 */
const destroy = () => {
    if (!currentComponent) return;

    let hookNode = currentComponent.hookNode;
    if (!hookNode) return;

    // Clear all remaining hooks
    while (hookNode.next) {
        hookNode.value = undefined;
        // console.log(hookNode);
        hookNode = hookNode.next;
    }
    currentComponent.hookNode = hookNode;
};

/**
 * A custom `useState` hook for reactive state management.
 *
 * @template T
 * @param {T} initial - The initial state value.
 * @returns {[T, (val: T | ((prev: T) => T)) => void]} A tuple: current state and a setter function.
 */
const useState = (initial) => {
    // console.log("claeed");

    let hookNode = regression ? previewComponent.previewHookNode : currentComponent.hookNode;
    // console.log(hookNode)

    if (typeof hookNode.value === 'undefined') {
        hookNode.value = initial;
    }
    // console.log(hookNode)

    const set = val => {
        hookNode.value = typeof val == 'function' ? val(hookNode.value) : val;
        // console.log('In regression', hookNode, val);
        if (!regression) {
            currentComponent.rerender();
            // console.log('Called and arent regression',
            //     hookNode,
            //     val
            // )
        }
    };

    if (regression) {
        // console.log("Move ahead", hookNode.value);
        previewComponent.previewHookNode = hookNode.next = hookNode.next || { next: null };

    } else {
        currentComponent.hookNode = hookNode.next = hookNode.next || { next: null };
        // console.log("Move ahead real", hookNode.value);
    }

    // console.log(regression, [hookNode.value, set]);


    return [hookNode.value, set];
};

const useRef = (initial) => {
    let hookNode = regression ? previewComponent.previewHookNode : currentComponent.hookNode;

    if (typeof hookNode.value === 'undefined') {
        hookNode.value = { current: initial };
    }

    if (regression) {
        previewComponent.previewHookNode = hookNode.next = hookNode.next || { next: null };
    } else {
        currentComponent.hookNode = hookNode.next = hookNode.next || { next: null };
    } return hookNode.value;
};

const useEffect = (effect, deps) => {
    let hookNode = regression ? previewComponent.previewHookNode : currentComponent.hookNode;
    const hasNoDeps = !deps;

    const oldHook = hookNode.value;
    const hasChangedDeps = typeof oldHook !== 'undefined'
        ? !deps.every((dep, j) => Object.is(dep, oldHook.deps[j]))
        : true;

    if (hasNoDeps || hasChangedDeps) {
        // Queue cleanup if exists
        if (oldHook?.cleanup) {
            queueMicrotask(() => {
                oldHook.cleanup?.()
            });
        }

        // Schedule new effect after render
        queueMicrotask(() => {
            const cleanup = effect();
            hookNode.value = { deps, cleanup };
        });
    } else {
        // Keep old deps & cleanup
        hookNode.value = oldHook;
    }

    if (regression) {
        previewComponent.previewHookNode = hookNode.next = hookNode.next || { next: null };
    } else {
        currentComponent.hookNode = hookNode.next = hookNode.next || { next: null };
    }
};

const useMemo = (compute, deps) => {
    let hookNode = regression ? previewComponent.previewHookNode : currentComponent.hookNode;

    const prev = hookNode.value;

    const hasNoDeps = !deps;
    const hasChanged = prev
        ? !deps.every((d, j) => Object.is(d, prev.deps[j]))
        : true;

    if (hasNoDeps || hasChanged) {
        const value = compute();
        hookNode.value = { value, deps };
        if (regression) {
            previewComponent.previewHookNode = hookNode.next = hookNode.next || { next: null };
        } else {
            currentComponent.hookNode = hookNode.next = hookNode.next || { next: null };
        }
        return value;
    }

    if (regression) {
        previewComponent.previewHookNode = hookNode.next = hookNode.next || { next: null };
    } else {
        currentComponent.hookNode = hookNode.next = hookNode.next || { next: null };
    }
    return prev.value;
};

function createRoot(fn, target, id = 'default') {
    const comp = {
        hooks: { next: null, ...getHooks(id) },
        previewHookNode: { next: null },
        hookNode: null,
        vdom: null,
        target: getTarget(target),
        renderFn: fn,
        setRenderFn: (fn) => comp.renderFn = fn,
        rerender: () => {
            currentComponent = comp;
            previewComponent = comp;
            resetContext();
            resetPreview();

            console.log(comp);
            const newVNode = comp.renderFn();
            // console.log('Head preview',headPreview)

            if (!comp.vdom) {
                comp.vdom = RenderVDOM.render(newVNode, comp.target);
                // console.log({ thisisvdom: comp.vdom, newVNode });
            } else {
                // console.log({ beforeUpdate: comp.vdom, newVNode });
                // console.log(currentComponent)
                comp.vdom = RenderVDOM.update(comp.target, comp.vdom, newVNode);
                // console.log(currentComponent)
                // console.log({ After: comp.vdom });   

                // console.log(comp);
            }
            setHooks(id, comp.hooks);
        }
    };
    comp.rerender();
    return comp;
}


export {
    resetContext, useState, useEffect,
    useMemo, useRef, createRoot,
    forgot, destroy, retainData,
    comp, manageComponent, allocate,
    orphan, setRegression, triggerRerender
};