/*
 *  Copyright (C) 2025 CKATEPTb
 *
 * This file is part of pjsx-boilerplate.
 *
 * pjsx-boilerplate is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * pjsx-boilerplate is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

import {Component} from "@/component";
import {lazyPeek, peek} from "@pjsx/core";

function appendChild(parent: HTMLElement | DocumentFragment, child: any) {
    if (child instanceof HTMLElement || child instanceof DocumentFragment) {
        parent.appendChild(child);
    } else if (Array.isArray(child)) {
        child.forEach(c => appendChild(parent, c));
    } else if (child != null && child !== false) {
        parent.appendChild(document.createTextNode(String(child)));
    }
}

function observeLifecycle(element: HTMLElement, component: Component) {
    const parent = (component.props as any).__parent
    lazyPeek<MutationObserver>(self => new MutationObserver((mutations) => {
        mutations.forEach(({addedNodes, removedNodes}) => {
            if (Array.from(addedNodes).includes(element)) component.onMount?.();
            if (Array.from(removedNodes).includes(element)) {
                component.onUnmount?.();
                self().disconnect();
            }
        });
    })).peek(val => val.observe(parent || document.body, {childList: true, subtree: true}))
}

type Constructor = new (props?: any) => Component
type Tag = undefined | keyof HTMLElementTagNameMap | Constructor | Function
type Props = { __parent: HTMLElement, children?: HTMLElement[], ref: HTMLElement }

function jsx(tag: Tag, props: Props): HTMLElement | DocumentFragment {
    console.log('jsx:', tag, props)
    const element = (function createElement(tag: Tag) {
        const type = typeof tag
        switch (type) {
            case "string":
                return lazyPeek(() => {
                    try {
                        return document.createElement(tag as string)
                    } catch (e) {
                        return document.createTextNode(tag as string)
                    }
                }).get()
            case "function":
                return peek(tag as Function).map(tag => {
                    if (/^class\s/.test(String(tag) || '')) {
                        const component = new (tag as Constructor)(props);
                        component.beforeMount?.()
                        const element = component.render() as HTMLElement
                        const children = props?.children || []
                        const onMount = component.onMount
                        component.onMount = () => {
                            children.forEach(value => element.appendChild(value))
                            onMount?.()
                        }
                        observeLifecycle(element, component)
                        return element
                    } else {
                        return tag(props)
                    }
                }).get()
            default: return jsx(String(tag) as Tag, props)
        }
    })(tag)
    if (element instanceof HTMLElement) {
        for (const [key, value] of Object.entries(props)) {
            if (key == 'children') {
                peek(value)
                    .map(val => (Array.isArray(val) ? val : [val]).map(val => {
                        if (val instanceof Node) return val
                        return jsx(val, {} as unknown as Props)
                    }))
                    .get()
                    .forEach(val => {
                        if (val instanceof Node) {
                            element.appendChild(val)
                        }
                    })
            } else if (key.startsWith("on") && typeof value === "function") {
                element.addEventListener(key.slice(2).toLowerCase(), value);
            } else if (key in element) {
                (element as any)[key] = value
            } else {
                element.setAttribute(key, String(value));
            }
        }
    }
    return element as HTMLElement
}

function fragment(props: any): HTMLElement {
    return jsx(document.createDocumentFragment, props) as HTMLElement;
}

export {jsx, jsx as jsxs, jsx as jsxDEV, fragment as Fragment}