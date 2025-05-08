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


export interface Peek<T> {
    map<R>(fn: (val: T) => R): Peek<R>

    flatMap<R>(fn: (val: T) => Peek<R>): Peek<R>

    peek(fn: (val: T) => void): Peek<T>

    get(): T
}

export function peek<T>(obj: T) {
    return {
        map<R>(fn: (val: T) => R): Peek<R> {
            return peek(fn(obj))
        },
        flatMap<R>(fn: <T>(val: T) => Peek<R>): Peek<R> {
            return fn(obj)
        },
        peek(fn: <T>(val: T) => void): Peek<T> {
            fn(obj)
            return this;
        },
        get() {
            return obj;
        }
    } as Peek<T>
}


export function lazyPeek<T>(fn: (self: () => T) => T): Peek<T> {
    const res = fn(() => res)
    return peek(res)
}