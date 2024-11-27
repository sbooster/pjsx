// Сюда элементы попадают уже рекурсивно, что большой плюс, не нужно делать h внутри h
import {Schedulers} from "schedulers";
import {Flux, Mono, Publisher, Subscription} from "reactive";
import {isPrimitive} from "@/utils";

export function h(
    tag: string | JSX.FuncComponent | JSX.ClassComponentConstructor,
    props: JSX.Props | JSX.WithChildren<JSX.HtmlAttributes> | null
): JSX.Element {
    if (typeof tag === 'function') {
        if (tag.prototype?.render != null) {
            const instance = new (tag as JSX.ClassComponentConstructor)(props as JSX.Props);
            instance.beforeMount?.();
            const element = instance.render() as Node;
            Schedulers.async().schedule(() => instance.mounted?.());
            observeRemoval(element, () => {
                instance.beforeUnmount?.();
                Schedulers.async().schedule(() => instance.unmounted?.());
            })
            return element;
        } else {
            return (tag as JSX.FuncComponent)?.(props as JSX.Props ?? {});
        }
    }
    const element = document.createElement(tag);
    if (props) {
        const {children, style, class: className, ...restProps} = props;
        if (style && typeof style === 'object') Object.assign(element.style, style);
        (className as string)?.split(' ')?.forEach((cls) => element.classList.add(cls));
        for (const [key, value] of Object.entries(restProps)) {
            if (key.startsWith('on') && typeof value === 'function') {
                const event = key.slice(2).toLowerCase();
                element.addEventListener(event, value as EventListenerOrEventListenerObject)
            } else if (value != null) {
                element.setAttribute(key, String(value));
            }
        }
        if (children) {
            const appendChild = (child: JSX.Children) => {
                if (child instanceof Flux || child instanceof Mono) {
                    let publisher: Publisher<unknown> = child
                    if (publisher instanceof Flux) publisher = publisher.distinctUntilChanged();
                    const pointer: Comment = document.createComment(' ');
                    element.appendChild(document.createComment(' '))
                    element.appendChild(pointer);
                    const subscribe: Subscription = publisher.subscribe(data => {
                        if (data instanceof Node) pointer.previousSibling.replaceWith(data)
                        else if (isPrimitive(data)) {
                            pointer.previousSibling.remove()
                            element.insertBefore(document.createTextNode(String(data)), pointer)
                        }
                    });
                    observeRemoval(pointer, () => subscribe?.unsubscribe())
                    subscribe?.request(Number.MAX_SAFE_INTEGER)
                } else if (child instanceof Node) element.appendChild(child);
                else if (isPrimitive(child)) element.appendChild(document.createTextNode(String(child)));
            };
            [children].flat(Number.MAX_SAFE_INTEGER).forEach(appendChild);
        }
    }
    return element
}

function observeRemoval(element: Node, callback: () => void) {
    if (element instanceof Node) {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.removedNodes.forEach((node) => {
                    if (node === element) {
                        callback()
                        observer.disconnect();
                    }
                });
            });
        });
        observer.observe(document.body, {childList: true, subtree: true});
    }
}

export const Fragment = ({children}: JSX.WithChildren) => {
    return children
}