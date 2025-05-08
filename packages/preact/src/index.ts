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


import * as preactRuntime from 'preact/jsx-runtime'
import {useEffect} from 'preact/hooks';
import {Flux, peek} from "@pjsx/core";
import {signal} from "@preact/signals";

function isPublisher(props: any) {
    return typeof props == 'object' && typeof props?.subscribe == 'function'
}

function jsx(tag: any, props: any, key?: string) {
    const unwrap = (props: any): any => {
        if (props == null) return props
        if (Array.isArray(props)) return props.map(props => unwrap(props))
        if (isPublisher(props)) return peek(signal<any>()).peek(signal => {
            useEffect(() => {
                const sub = Flux.from<any>(props)
                    .distinctUntilChanged()
                    .subscribe({
                        onNext(value) {
                            signal.value = value
                        },
                        onError(error) {
                            console.error(error)
                        }
                    })
                sub.request(Number.MAX_SAFE_INTEGER)
                return () => {
                    sub.unsubscribe()
                }
            }, [tag]);
        }).get();
        if (typeof props == "object") {
            for (let key of Object.keys(props)) {
                if (key == 'props' || key.startsWith('_')) continue
                if (props[key] == null) continue
                props[key] = unwrap(props[key])
            }
            return props
        }
        return props
    }
    return preactRuntime.jsx(tag, unwrap(props), key);
}

const Fragment = preactRuntime.Fragment
export {jsx, jsx as jsxs, jsx as jsxDEV, Fragment}

export type {
    JSXInternal as JSX
} from '@/jsx'