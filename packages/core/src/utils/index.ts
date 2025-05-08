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


import Json from "@/serializers/json";
import Sia from "@/serializers/sia";
import {BackpressurePublisher, Publisher} from "@/publishers";
import {Sink} from "@/sinks";
import {Subscriber, Subscription} from "@/subscriptions";

export function deepCopy(obj: any, mode: 'sia' | 'json' = 'json') {
    switch (mode) {
        case "sia":
            return Sia.deserialize(Sia.serialize(obj))
        default:
            return Json.deserialize(Json.serialize(obj))
    }
}

export function isPublisher(obj: any): obj is Publisher<any> {
    return obj && typeof obj.subscribe === 'function';
}


export function combine<T>(sink: Sink<T> & Publisher<T>, generator: ((sink: Sink<T>) => void)): Publisher<T> {
    return new class CombinedPublisher extends BackpressurePublisher<T> {
        public override subscribe(subscriber: Subscriber<T>): Subscription {
            const gen = generator(sink) as unknown as Subscription
            const sub = super.subscribe(subscriber)
            return {
                request(count: number) {
                    sub.request(count)
                    gen?.request(count)
                },
                unsubscribe() {
                    sub.unsubscribe()
                    gen?.unsubscribe()
                }
            };
        }
    }(sink)
}