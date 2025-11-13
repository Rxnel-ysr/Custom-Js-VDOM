import { allocate, forgot, manageComponent, orphan } from "./vdom.hooks.js";

const _keys = {};
const getKeyVal = key => _keys[key] ?? null
const getKey = vnode => vnode?.props?.key ?? null;
const hasKey = vnode => vnode && typeof vnode.props?.key !== 'undefined';
const setKey = (key, vnode) => _keys[key] = vnode.el

const flattenChildren = (children) =>
    children.flat(Infinity).filter(c => c !== false && c !== null && c !== undefined);

const createVNode = (tag, props = {}, ...children) => {
    return {
        tag,
        props,
        children: flattenChildren(children).map(v => wrapPrimitive(v)),
        isComp: false
    };
};

function wrapPrimitive(node) {
    if (['string', 'number'].includes(typeof node)) {
        const text = String(node);
        return {
            tag: '#text',
            children: [text],
            props: {},
            el: document.createTextNode(text),
        };
    }
    return node;
}


function cleanupVNode(node) {
    if (!node || typeof node !== 'object') return;
    // console.log('clean up:',node);


    const el = node.el;

    if (el && node.props) {
        for (const key in node.props) {
            const value = node.props[key];
            if (key.startsWith('on') && typeof value === 'function') {
                const event = key.slice(2).toLowerCase();
                el.removeEventListener(event, value);
            }
        }
    }

    if (typeof node.props?.useCleanup === 'function') {
        // console.log(node.props);

        try {
            node.props.useCleanup(node.el);
        } catch (e) {
            // console.warn('VNode cleanup error:', e);
        }
    }

    if (typeof node.ref === 'function') {
        node.ref(null);
    }

    if (Array.isArray(node.children)) {
        for (const child of node.children) cleanupVNode(child);
    }

    node.children = null;
    node.props = null;
}


const shouldSkipPatch = (old, next) => {
    if (!old || !next) return false;

    // Tag or key mismatch -> must patch
    if (old.tag !== next.tag || getKey(old) !== getKey(next)) return false;

    // Props diff check
    const oldProps = old.props || {};
    const nextProps = next.props || {};
    const oldKeys = Object.keys(oldProps);
    const nextKeys = Object.keys(nextProps);

    if (oldKeys.length !== nextKeys.length) return false;

    for (const key of oldKeys) {
        if (oldProps[key] !== nextProps[key]) return false;
    }

    return true;
};

const updateProps = (el, oldProps, newProps) => {
    // console.log(el, oldProps, newProps)
    const allProps = { ...oldProps, ...newProps };
    // console.log(el, allProps);

    for (const key in allProps) {
        const oldValue = oldProps[key];
        const newValue = newProps[key];


        if (key === 'useCleanup' && (typeof oldValue === 'function' || typeof newValue == 'function')) {
            continue
        };

        if (newValue === undefined) {
            if (key === 'class') {
                el.className = '';
            } else if (key === 'style') {
                el.style.cssText = '';
            } else if (key.startsWith('on') && typeof oldValue === 'function') {
                el.removeEventListener(key.slice(2).toLowerCase(), oldValue);
            } else {
                el.removeAttribute(key);
            }
        } else if (oldValue !== newValue) {
            if (key === 'class') {
                el.className = Array.isArray(newValue)
                    ? newValue.filter(Boolean).join(' ')
                    : newValue;
            } else if (key === 'style') {
                if (typeof newValue === 'string') {
                    el.style.cssText = newValue;
                } else {
                    for (const style in oldValue || {}) {
                        if (!newValue || newValue[style] === undefined) {
                            el.style[style] = '';
                        }
                    }
                    Object.assign(el.style, newValue);
                }
            } else if (key.startsWith('on') && typeof newValue === 'function') {
                if (oldValue) el.removeEventListener(key.slice(2).toLowerCase(), oldValue);
                el.addEventListener(key.slice(2).toLowerCase(), newValue);
            } else {
                el.setAttribute(key, newValue);
            }
        }
    }
    return newProps;
};


const renderVNode = (vnode, parentIsSvg = false) => {
    // console.log('Creating', vnode);
    // if (typeof vnode.tag == 'function') {
    //     return createComponent()
    // }

    // console.log("entering render", vnode);
    // console.log(work);

    let work;
    if (vnode.isComp) {
        // console.log("Is a comp", vnode);

        work = vnode.vdom = vnode.render()
        // console.log({ phase0: work, vnode });
    } else {
        work = vnode
    }
    // console.log({ phase1: work });

    if (work.tag == '#text') {
        return work.el;
    }

    let isSvg = work.tag == 'svg' || parentIsSvg;

    // console.log({ phase2: work });

    if (work.tag === '#fragment') {
        const start = document.createComment('fragment-start');
        const end = document.createComment('fragment-end');
        const frag = document.createDocumentFragment();

        work.el = start;
        work._end = end;

        frag.appendChild(start);
        for (let child of work.children || []) {
            const el = renderVNode(child);
            if (el) frag.appendChild(el);
        }
        frag.appendChild(end);

        return frag;
    }

    // console.log({ phase3: work });

    const el = isSvg ? document.createElementNS('http://www.w3.org/2000/svg', work.tag) : document.createElement(work.tag);

    // console.log({ phase4: work });

    for (const [key, value] of Object.entries(work.props)) {
        if (key === 'useCleanup' && typeof value === 'function') continue;
        if (key === 'key') setKey(value, work);

        if (key === 'class') {
            if (isSvg) {
                el.setAttribute('class', Array.isArray(value) ? value.filter(Boolean).join(' ') : value)
            } else {
                el.className = Array.isArray(value) ? value.filter(Boolean).join(' ') : value;
            }
        } else if (key === 'style') {
            if (typeof value === 'string') {
                el.style.cssText = value;
            } else {
                Object.assign(el.style, value);
            }
        } else if (key.startsWith('on') && typeof value === 'function') {
            el.addEventListener(key.slice(2).toLowerCase(), value);
            // setEvent(el, key.slice(2).toLowerCase(), value, work)
        } else {
            el.setAttribute(key, value);
        }
    };
    // console.log({ phase5: work });

    if (work.props.shadow) {
        const shadow = el.attachShadow({
            mode: work.props.shadow === true ? 'open' : work.props.shadow
        });
        el._shadow = shadow;
    }

    const children = Array.isArray(work.children) ? work.children : [work.children];

    for (let child of children) {
        if (
            child === null || child === undefined ||
            typeof child === 'boolean'
        ) continue;

        if (child.tag == '#fragment') {
            for (let frag of child.children) {
                el.appendChild(renderVNode(frag, isSvg));
            }
            continue;
        }

        el.appendChild(renderVNode(child, isSvg));
    }


    vnode.el = el;
    // console.log("Created", vnode);

    return el;
}


const delaySync = ms => {
    const start = Date.now();
    while (Date.now() - start < ms) { }
};

function reorder(parent, desiredIndex, el) {

}

const patchChildrenWithKeys = (parent, oldChildren, newChildren, parentNode = null) => {
    // console.log('Patching child');

    const oldKeyMap = new Map();
    oldChildren.forEach((vnode) => oldKeyMap.set(vnode.props.key, vnode));

    const newKeySet = new Set();
    const updatedChildren = [];

    newChildren.forEach((newVNode, i) => {
        const key = newVNode.props.key;
        newKeySet.add(key);

        const oldVNode = oldKeyMap.get(key);
        if (oldVNode) {
            // console.log(oldVNode);

            updateProps(oldVNode.el, oldVNode.props, newVNode.props)

            const oldChildren = oldVNode.children || [];
            const newChildren = newVNode.children || [];
            const max = Math.max(oldChildren.length, newChildren.length);

            for (let i = 0; i < max; i++) {
                patch(
                    oldVNode.el,
                    oldChildren[i],
                    newChildren[i],
                    i,
                    oldVNode,
                );
            }


            newVNode.el = oldVNode.el;

            updatedChildren.push(newVNode);
        } else {
            const el = renderVNode(newVNode);
            newVNode.el = el;
            parent.insertBefore(el, parent.children[i] || null);
            updatedChildren.push(newVNode);
        }
    });

    oldChildren.forEach((oldVNode) => {
        if (!newKeySet.has(oldVNode.props.key)) {
            cleanupVNode(oldVNode)
            parent.removeChild(oldVNode.el);
        }
    });

    updatedChildren.forEach((vnode, i) => {
        const current = parent.children[i];
        if (vnode.el !== current) {
            parent.insertBefore(vnode.el, current);
        }
    });
    // console.log(updatedChildren);


    return updatedChildren;
};

const patchComponent = (parent, oldComp, newComp) => {
    newComp.vdom = newComp.render()
    // console.log("Okay gotten here!");

    if (newComp == null) {
        if (oldComp?.el) {
            cleanupVNode(oldComp.vdom)
            parent.removeChild(oldComp.el);
        }
        return null;
    }


    if (newComp?.vdom?.tag === '#text') {
        // console.log('Patch 2', { new: newComp, old: oldComp });

        const oldText = oldComp.vdom?.children?.[0];
        const newText = newComp.vdom?.children?.[0];

        if (oldText !== newText && oldComp.el) {
            oldComp.el.nodeValue = newText;
        }
        newComp.el = oldComp?.el;
        return newComp;
    }

    if (oldComp?.vdom?.tag === '#fragment' && newComp.vdom?.tag !== '#fragment') {
        // console.log('Its from fragment');
        let node = oldComp.el;
        const end = oldComp._end;
        // console.log({ oldComp, node, end });

        if (end == undefined) {
            return;
        }

        while (node && node !== end) {
            const next = node.nextSibling;
            parent.removeChild(node);
            node = next;
        }

        const newEl = renderVNode(newComp.vdom)
        parent.replaceChild(newEl, oldComp._end)
        newComp.el = newEl;
        return newComp;

    }

    if (oldComp.vdom == null && newComp.vdom?.tag === '#fragment') {
        const frag = renderVNode(newComp.vdom)
        parent.appendChild(frag)
        return newComp;
    }


    if (oldComp.vdom == null) {
        // console.log('Patch 4', { new: newComp, old: oldComp });
        // console.log(typeof newComp.props);
        const el = renderVNode(newComp.vdom);
        // console.log(newComp, el);

        parent.appendChild(el);
        newComp.el = el;
        // console.log(newComp);

        return newComp;
    }

    // console.log("here lies comp");

    if (oldComp.vdom?.tag !== newComp.vdom?.tag) {
        cleanupVNode(oldComp.vdom);

        if (newComp.vdom?.tag === '#fragment') {

            const frag = renderVNode(newComp.vdom)
            parent.replaceChild(frag, oldComp.el);
            return newComp;
        }

        const el = renderVNode(newComp.vdom);
        parent.replaceChild(el, oldComp.el);
        newComp.el = el;
        return newComp;
    }



    // console.log("HEEEEEEEEREEEEEEEE", { oldCompEL: oldComp.el, oldComp, newComp });
    // 424
    updateProps(oldComp.el, (oldComp.vdom?.props || {}), (newComp.vdom?.props || {}));
    // console.log("where?")

    if (
        newComp.vdom?.tag === 'input' &&
        newComp.vdom?.props?.value !== undefined &&
        oldComp.el.value !== newComp.vdom?.props.value
    ) {
        oldComp.el.value = newComp.vdom?.props.value;
    }
    // console.log("where?")

    const oldChildren = oldComp.vdom?.children || [];
    const newChildren = newComp.vdom?.children || [];
    if (oldChildren.some(node => hasKey(node)) && newChildren.some(node => hasKey(node))) {
        // console.log('Here!');
        patchChildrenWithKeys(oldComp.el, oldChildren, newChildren)

    } else {
        // console.log(oldComp);

        const max = Math.max(oldChildren.length, newChildren.length);
        for (let i = 0; i < max; i++) {
            // console.log('Here?', oldComp, oldChildren, newChildren);
            patch(
                oldComp.vdom?.tag === '#fragment' ? parent : oldComp.el,
                oldChildren[i],
                newChildren[i],
                // fromHmr
            );
        }
    }

    if (newComp.vdom?.tag === '#fragment') {
        newComp._end = oldComp._end;
    }
    newComp.el = oldComp.el;
    // newComp.vdom = oldComp.vdom
    return newComp;
}

const handleComponent = (parent, old, newOne) => {
    if (old?.isComp && newOne?.isComp) {
        if (old.stringified !== newOne.stringified) {
            // console.log("Not same component", parent, old.el, newOne);
            // current, its based on current hooknode,

            if (old.compHooks > newOne.compHooks) {
                forgot(old.compHooks)
                orphan(old.compHooks - newOne.compHooks)
                // allocate(old.compHooks - newOne.compHooks)
            } else if (old.compHooks < newOne.compHooks) {
                forgot(old.compHooks)
                allocate(newOne.compHooks - old.compHooks)
                // orphan(old.compHooks)
            } else if (old.compHooks === newOne.compHooks) {
                forgot(old.compHooks)
            }
            // orphan(old.compHooks)
            // allocate(old.compHooks)
            let newVDom = newOne.vdom = newOne.render()
            const newEl = renderVNode(newVDom)
            // console.log({ parent, old, newOne });

            parent.replaceChild(newEl, old.el)
            newOne.el = newEl

            return newOne
        } else {
            // console.log("Same component", parent, old, newOne);
            return patchComponent(parent, old, newOne)
        }
    } else if (old?.isComp && !newOne?.isComp) {
        forgot(old.compHooks)
        orphan(old.compHooks - 1)
        cleanupVNode(old.vdom)

        newOne.el = renderVNode(newOne)

        parent.replaceChild(newOne.el, old.el)

        return newOne
    } else if (!old?.isComp && newOne?.isComp) {
        // console.log("here as initial?")
        allocate(newOne.compHooks - 1)
        cleanupVNode(old)

        let newVNode = newOne.vdom = newOne.render()

        newOne.el = renderVNode(newVNode)

        parent.replaceChild(newOne.el, old.el)

        return newOne
    }
}


const patch = (parent, oldNode, newNode) => {
    // console.log(parent,oldNode, newNode);

    // console.log(parent);

    // delaySync(1000)
    if (oldNode == null && newNode == null) return null;

    if (
        oldNode?.isComp && newNode?.isComp ||
        oldNode?.isComp && !newNode?.isComp ||
        !oldNode?.isComp && newNode?.isComp
    ) {
        // console.log("got here!")
        return handleComponent(parent, oldNode, newNode);
    }
    // console.log(parent,oldNode, newNode, "NO?");

    // if (shouldSkipPatch(oldNode, newNode)) return newNode;

    // if (oldNode == null &&  typeof newNode.tag === 'function') {
    //     // 💥 create a new component with its own hook tree!
    //     return createComponent(newNode.tag, parent, newNode.key || 'default');
    // }

    if (newNode == null) {
        // console.log('Patch 1', { new: newNode, old: oldNode });

        if (oldNode?.el) {
            cleanupVNode(oldNode)
            parent.removeChild(oldNode.el);
        }
        return null;
    }

    // console.log(parent,oldNode, newNode, "NO?");
    if (newNode.tag === '#text') {
        // console.log('Patch 2', { new: newNode, old: oldNode });

        if (oldNode?.tag === '#text') {
            const oldText = oldNode.children?.[0];
            const newText = newNode.children?.[0];

            if (oldText !== newText && oldNode.el) {
                oldNode.el.nodeValue = newText;
            }
            newNode.el = oldNode?.el;
            return newNode;
        }
        const newEl = renderVNode(newNode);
        if (oldNode?.el) {
            parent.replaceChild(newEl, oldNode.el);
        } else {
            parent.appendChild(newEl);
        }
        newNode.el = newEl;
        return newNode;
    }

    if (oldNode?.tag === '#fragment' && newNode.tag !== '#fragment') {
        // console.log('Its from fragment');
        let node = oldNode.el;
        const end = oldNode._end;
        // console.log({ oldNode, node, end });

        if (end == undefined) {
            return;
        }

        while (node && node !== end) {
            const next = node.nextSibling;
            parent.removeChild(node);
            node = next;
        }

        const newEl = renderVNode(newNode)
        parent.replaceChild(newEl, oldNode._end)
        newNode.el = newEl;
        return newNode;

    }

    if (oldNode == null && newNode.tag === '#fragment') {
        const frag = renderVNode(newNode)
        parent.appendChild(frag)
        return newNode;
    }


    if (oldNode == null) {
        // console.log('Patch 4', { new: newNode, old: oldNode });
        // console.log(typeof newNode.props);

        const el = renderVNode(newNode);
        // console.log(newNode, el);

        parent.appendChild(el);
        newNode.el = el;
        // console.log(newNode);

        return newNode;
    }

    // console.log("here lies comp");

    if (oldNode.tag !== newNode.tag) {
        cleanupVNode(oldNode);

        if (newNode.tag === '#fragment') {
            const frag = renderVNode(newNode)
            parent.replaceChild(frag, oldNode.el);
            return newNode;
        }

        const el = renderVNode(newNode);
        parent.replaceChild(el, oldNode.el);
        newNode.el = el;
        return newNode;
    }

    if (newNode.tag === 'svg') {
        cleanupVNode(oldNode);

        const el = renderVNode(newNode, true);
        parent.replaceChild(el, oldNode.el);
        newNode.el = el;
        return newNode;
    }

    // console.log(oldNode, newNode);
    // console.log(parent,oldNode, newNode, "this?");

    updateProps(oldNode.el, (oldNode.props || {}), (newNode.props || {}));
    // console.log(parent,oldNode, newNode, "END");

    if (
        newNode.tag === 'input' &&
        newNode.props?.value !== undefined &&
        oldNode.el.value !== newNode.props.value
    ) {
        oldNode.el.value = newNode.props.value;
    }

    const oldChildren = oldNode.children || [];
    const newChildren = newNode.children || [];
    if (oldChildren.some(node => hasKey(node)) && newChildren.some(node => hasKey(node))) {
        // console.log('Here!');
        patchChildrenWithKeys(oldNode.el, oldChildren, newChildren)

    } else {
        const max = Math.max(oldChildren.length, newChildren.length);
        for (let i = 0; i < max; i++) {
            patch(
                oldNode.tag === '#fragment' ? parent : oldNode.el,
                oldChildren[i],
                newChildren[i],
                // fromHmr
            );
        }
    }

    if (newNode.tag === '#fragment') {
        newNode._end = oldNode._end;
    }
    newNode.el = oldNode.el;
    return newNode;
};


const RenderVDOM = {
    createVNode,
    render(vnode, container) {
        container = typeof container === 'string' ? getTarget(container) : container;
        container.innerHTML = '';
        const node = typeof vnode === 'string' ? vnode : createVNode(vnode.tag, vnode.props, vnode.children);
        return patch(container, null, node);
    },
    update(container, oldNode, newNode) {
        return patch(container, oldNode, newNode);
    }
};

const __ = (tag, props = {}, ...children) => {
    const vnode = createVNode(tag, props, children);
    return renderVNode(vnode);
};

const getTarget = (t, scope = document) => {
    if (t instanceof Node) {
        return t;
    }
    const target = scope.querySelector(t);
    if (!target) throw new Error(`Target "${t}" not found`);
    return target;
};

let customVdom = {}

const registerCustomVdom = (tag, resolver) => {
    customVdom[tag] = resolver
}

const html = new Proxy({}, {
    get: (_, tag) => {
        const actions = {
            mount: (el, selector, scope = document) =>
                getTarget(selector, scope).replaceChildren(el),
            push: (el, selector, scope = document) =>
                getTarget(selector, scope).appendChild(el),
            mountShadow: (el, selector, scope = document) => {
                const target = getTarget(selector, scope);
                if (!target._shadow) target.attachShadow({ mode: 'open' });
                target._shadow.replaceChildren(el);
                return target._shadow;
            },
            vdom: RenderVDOM,
            _: __,
            $: (...children) => ({ tag: '#fragment', children: flattenChildren(children) }),
            ...customVdom
        };


        return actions[tag] || customVdom[tag] || ((props = {}, ...children) => {
            if (typeof props == 'string') {
                return createVNode(tag, {}, [props])
            } else if (Array.isArray(props)) {
                return createVNode(tag, {}, props)
            } else {
                return createVNode(tag, props, children)
            }
        });
    }
});

export { html, getTarget, getKey, updateProps, createVNode, renderVNode, cleanupVNode, RenderVDOM, patch, registerCustomVdom };