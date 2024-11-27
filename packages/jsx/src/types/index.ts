import type * as Html from '@michijs/htmltype'
import type * as Css from 'csstype'


type BaseProps = Record<string, unknown>
declare global {
    export namespace JSX {
        type Primitive = string | number | boolean | null | undefined
        type Element = string | null // Точно ли Element должен быть string?
        type Children = Element | Element[] | undefined

        type WithChildren<T = object> = T & { children?: Children }
        type HtmlAttributes = Html.AllAttributes
        type CssProperties = Css.PropertiesHyphen

        interface IntrinsicElements extends IntrinsicElementsMap {
        }

        type IntrinsicElementsMap = HtmlIntrinsicElementsMap & SvgIntrinsicElementsMap

        type HtmlIntrinsicElementsMap = {
            [K in keyof Html.HTMLElements]: WithChildren<
                Omit<Html.HTMLElements[K], 'style'> & {
                style?: Css.PropertiesHyphen
            }
            >
        }

        type SvgIntrinsicElementsMap = {
            [K in keyof Html.SVGElements]: WithChildren<
                Omit<Html.SVGElements[K], 'style'> & {
                style?: Css.PropertiesHyphen
            }
            >
        }

        interface ElementChildrenAttribute {
            children: object
        }

        // Used for class components to declare the props type
        interface ElementAttributesProperty {
            props: object
        }

        type BaseProps = Record<string, unknown>

        type Props<T extends BaseProps = BaseProps> = WithChildren<T>
        type FuncComponent<T extends BaseProps = BaseProps> = (
            props: Props<T>
        ) => Element

        type ClassComponent<T extends BaseProps = BaseProps> = (new () => {
            props?: T
        }) & { key: string }
    }
}