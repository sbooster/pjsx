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


import {Subscriber, Subscription} from "@/subscriptions";
import {Publisher} from "@/publishers";
import {Sink} from "@/sinks";

type Backpressure<T> = {
    subscriber: Subscriber<T>
    data: EmitAction<T>[]
    requested: number;
}

export type EmitAction<T> = {
    emit: 'next' | 'error' | 'complete'
    data?: T | Error
}

export abstract class BackpressureSink<T> implements Sink<T>, Publisher<T> {
    protected readonly subscribers = new Set<Backpressure<T>>()
    protected completed = false

    public subscribe(subscriber: Subscriber<T>): Subscription {
        // if (this.completed) throw new Error('The completed sink is not accepting new subscribers.')

        const backpressure: Backpressure<T> = {
            subscriber: subscriber,
            data: [],
            requested: 0,
        }

        this.subscribers.add(backpressure)

        return {
            request: (count: number) => {
                backpressure.requested += count
                this.flush(backpressure)
            },
            unsubscribe: () => {
                backpressure.data = []
                this.subscribers.delete(backpressure)
            }
        }
    }

    public next(value: T): void {
        this.validateEmit()
        for (const subscriber of this.subscribers) {
            subscriber.data.push({emit: 'next', data: value})
            this.flush(subscriber)
        }
    }

    public error(error: Error): void {
        this.validateEmit()
        // if(this.completed) return
        for (const subscriber of this.subscribers) {
            subscriber.data.push({emit: 'error', data: error})
            this.flush(subscriber)
        }
    }

    public complete(): void {
        if (this.completed) return
        this.completed = true;
        for (const subscriber of this.subscribers) {
            subscriber.data.push({emit: 'complete'})
            this.flush(subscriber)
        }
        this.subscribers.clear()
    }

    protected emit(action: EmitAction<T>, subscriber: Subscriber<T>) {
        switch (action.emit) {
            case "next": {
                try {
                    subscriber.onNext(action.data as T)
                } catch (error) {
                    subscriber.onError(error as Error)
                }
                break;
            }
            case "error": {
                subscriber.onError(action.data as Error)
                break;
            }
            case "complete": {
                subscriber.onComplete()
            }
        }
    }

    protected validateEmit() {
        if (this.completed) throw new Error('The completed sink is not accepting new emits.')
    }

    private flush(backpressure: Backpressure<T>) {
        const data = backpressure.data;
        while (backpressure.requested > 0 && data.length > 0) {
            backpressure.requested--
            this.emit(data.shift() as EmitAction<T>, backpressure.subscriber)
        }
        if (data.length > 0 && data[0].emit == "complete") {
            backpressure.requested++
            this.flush(backpressure)
        }
    }
}