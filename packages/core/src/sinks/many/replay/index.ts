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
import ManySink from "@/sinks/many";
import {BackpressureSink, EmitAction} from "@/sinks/backpressure";

export abstract class ReplaySink<T> extends ManySink<T> implements BackpressureSink<T> {
    readonly buffer: EmitAction<T>[] = []

    protected replay(subscriber: Subscriber<T>) {
        for (const action of this.buffer) {
            this.emit(action, subscriber)
        }
    }

    protected store(emit: 'next' | 'error' | 'complete', data?: T | Error) {
        this.buffer.push({emit, data})
    }

    public override next(value: T): void {
        super.next(value)
        this.store('next', value)
    }

    public override error(error: Error) {
        super.error(error);
        this.store('error', error)
    }

    public override complete() {
        super.complete();
        this.store("complete")
    }

    public override subscribe(subscriber: Subscriber<T>): Subscription {
        const subscription = super.subscribe(subscriber)
        this.replay(subscriber)
        return subscription
    }
}