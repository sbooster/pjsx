export function h(
    tag: string | JSX.FuncComponent | JSX.ClassComponent,
    props: JSX.Props | JSX.WithChildren<JSX.HtmlAttributes> | null
): Element {
    console.log(tag, props)
    return document.createElement('div')
}

export const Fragment = ({children}: JSX.WithChildren) => {
    return children
}