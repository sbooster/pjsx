export * from '@pjsx/core';

declare abstract class Component<P extends object = {}> {
    readonly props: P;
    constructor(props?: P);
    abstract render(): HTMLElement;
    beforeMount?(): void;
    onMount?(): void;
    onUnmount?(): void;
}
type FunctionalComponent<P extends object = {}> = (props?: P) => HTMLElement;

type Constructor = new (props?: any) => Component;
type Tag = undefined | keyof HTMLElementTagNameMap | Constructor | Function;
type Props = {
    __parent: HTMLElement;
    children?: HTMLElement[];
    ref: HTMLElement;
};
declare function jsx(tag: Tag, props: Props): HTMLElement | DocumentFragment;
declare function fragment(props: any): HTMLElement;

declare namespace JSX {
    interface IntrinsicElements {
        [elemName: string]: any;
    }
    interface ElementClass {
        render: any;
    }
    interface ElementChildrenAttribute {
        children: any;
    }
}

export { Component, fragment as Fragment, type FunctionalComponent, JSX, jsx, jsx as jsxDEV, jsx as jsxs };
