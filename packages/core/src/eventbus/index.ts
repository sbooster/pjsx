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


import ManySink from "@/sinks/many";
import {Flux} from "@/publishers/flux";
import EventPriority from "@/eventbus/priority";
import EventBusEvent, {Event} from "@/eventbus/event";

type EventProcessor = {
    event: EventBusEvent<object>
    priority: EventPriority,
}

export class EventBusContainer {
    private sink = new ManySink<EventProcessor>()

    public emit<D extends object>(
        event: Event<D>,
        data: D
    ): EventBusEvent<D> {
        const instance: EventBusEvent<D> = new event(data)
        Object.keys(EventPriority)
            .filter(value => isNaN(value as unknown as number))
            .forEach(value => {
                this.sink.next({
                    event: instance,
                    priority: value as unknown as EventPriority
                })
            })
        return instance
    }

    public on<D extends object>(
        event: Event<D>,
        callback: (event: EventBusEvent<D>) => void,
        priority: EventPriority = EventPriority.NORMAL,
        ignoreCanceled = false
    ) {
        const subscription = Flux.from(this.sink)
            .cast<EventProcessor>()
            .filter(value => value.event instanceof event)
            .filter(value => value.priority as unknown as string == EventPriority[priority])
            .filter(value => ignoreCanceled || !value.event.canceled)
            .doOnNext(value => callback(value.event as EventBusEvent<D>))
            .subscribe();
        subscription.request(Number.MAX_SAFE_INTEGER)
        return {
            detach() {
                subscription.unsubscribe()
            }
        }
    }
}

export default new EventBusContainer()
