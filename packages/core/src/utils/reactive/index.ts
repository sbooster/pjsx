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


import {Publisher} from "@/publishers";
import {ReplayLatestSink} from "@/sinks/many/replay/latest";
import {Subscription} from "@/subscriptions";
import {Flux} from "@/publishers/flux";
import {peek} from "@/utils/peek";

// TODO Возможно стоит сделать рекурсивный Proxy?
export class Reactive<T> implements Publisher<T> {
    private readonly sink: ReplayLatestSink<T>
    private ref!: T

    public constructor(value: T) {
        this.sink = new ReplayLatestSink(1)
        this.next(value)
    }

    public next(value: T): Reactive<T> {
        this.ref = value
        this.sink.next(value)
        return this
    }

    public update(fn: (value: T) => T): Reactive<T> {
        return this.next(fn(this.ref))
    }

    public get(): T {
        return this.ref
    }

    public subscribe({
                         onNext = (value: T) => {
                         },
                         onError = (error: Error) => {
                         },
                         onComplete = () => {
                         }
                     } = {}): Subscription {
        return peek(this.asFlux().subscribe({
            onNext,
            onError,
            onComplete
        })).peek(val => val.request(Number.MAX_SAFE_INTEGER)).get()
    }

    public asFlux(): Flux<T> {
        return Flux.from(this.sink)
            .cast<T>()
            .distinctUntilChanged()
    }
}

export default function reactive<T>(value: T): Reactive<T> {
    if (value instanceof Reactive) return value
    return new Reactive(value)
}