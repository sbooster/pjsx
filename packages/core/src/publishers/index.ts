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
import {EmitAction} from "@/sinks/backpressure";

/**
 * Источник данных — может быть подписан подписчиком.
 */
export interface Publisher<T> {
    subscribe(subscriber: Subscriber<T>): Subscription
}

export class BackpressurePublisher<T> implements Publisher<T> {
    private backpressure: Array<EmitAction<T>> = []
    private subscriber?: Subscriber<T>
    private requested: number = 0;
    private subscription: Subscription

    public constructor(sink: Publisher<T>) {
        this.subscription = sink.subscribe({
            onNext: (value: T) => {
                this.backpressure.push({emit: 'next', data: value})
                this.flush()
            },
            onError: (error: Error) => {
                this.backpressure.push({emit: 'error', data: error})
                this.flush()
            },
            onComplete: () => {
                this.subscription.unsubscribe()
                this.backpressure.push({emit: 'complete'})
                this.flush()
            }
        })
        this.subscription.request(Number.MAX_SAFE_INTEGER)
    }

    private emit(action: EmitAction<T>) {
        switch (action.emit) {
            case "next": {
                try {
                    this.subscriber?.onNext(action.data as T)
                } catch (error) {
                    this.subscriber?.onError(error as Error)
                }
                break;
            }
            case "error": {
                this.subscriber?.onError(action.data as Error)
                break;
            }
            case "complete": {
                this.subscriber?.onComplete()
            }
        }
    }

    private flush() {
        while (this.requested > 0 && this.backpressure.length > 0) {
            this.requested--
            this.emit(this.backpressure.shift() as EmitAction<T>)
        }
        if (this.subscriber != null && this.backpressure[0]?.emit == 'complete') {
            this.emit(this.backpressure.shift() as EmitAction<T>)
        }
    }

    public subscribe(subscriber: Subscriber<T>): Subscription {
        if (this.subscriber != null) throw new Error("Backpressure unicast publisher is not accepting new subscribers")
        this.subscriber = subscriber;
        return {
            request: (count: number) => {
                this.requested += count
                this.flush()
            },
            unsubscribe: () => {
                this.backpressure = []
                this.subscription.unsubscribe()
            }
        };
    }

}