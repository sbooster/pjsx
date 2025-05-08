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
import {BackpressureSink} from "@/sinks/backpressure";

export default class OneSink<T> extends BackpressureSink<T> {
    public override subscribe(subscriber: Subscriber<T>): Subscription {
        if (this.subscribers.size > 0) {
            throw new Error("Only one subscriber is allowed for OneSink.")
        }
        return super.subscribe(subscriber)
    }

    public override next(value: T): void {
        super.next(value)
        this.complete()
    }

    public error(error: Error): void {
        super.error(error)
        this.complete()
    }
}
