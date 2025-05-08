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
import {ReplayAllSink} from "@/sinks/many/replay/all";
import {ReplayLimitSink} from "@/sinks/many/replay/limit";
import {ReplayLatestSink} from "@/sinks/many/replay/latest";
import OneSink from "@/sinks/one";

import {Sink} from "@/sinks";
import {ImmediateScheduler} from "@/schedulers/immediate";
import {MicroScheduler} from "@/schedulers/micro";
import {MacroScheduler} from "@/schedulers/macro";
import {DelayScheduler} from "@/schedulers/delay";
import {CancellableScheduler, Scheduler} from "@/schedulers";
import {Mono} from "@/publishers/mono";
import {Flux} from "@/publishers/flux";
import {BackpressurePublisher, Publisher} from "@/publishers";
import {AbstractPipePublisher, PipePublisher} from "@/publishers/pipe";
import {Subscriber, Subscription} from "@/subscriptions";
import Base64 from "@/serializers/base64";
import Sia from "@/serializers/sia";
import Stringify from "@/serializers/stringify";
import Json from "@/serializers/json";
import Rc4 from "@/serializers/rc4";
import Cache, {CacheOptions, OverflowPolicy, RemoveReason, StorageType} from "@/cache";
import EventBus, {EventBusContainer} from "@/eventbus";
import EventPriority from "@/eventbus/priority";
import Event from "@/eventbus/event"
import EventBusEvent from "@/eventbus/event"

export {type Sink, OneSink, ManySink, ReplayAllSink, ReplayLatestSink, ReplayLimitSink}

export const Sinks = {
    one: () => new OneSink(),
    many: () => ({
        multicast: () => new ManySink(),
        replay: () => ({
            all: () => new ReplayAllSink(),
            latest: (limit: number) => new ReplayLatestSink(limit),
            limit: (limit: number) => new ReplayLimitSink(limit)
        })
    })
}

export {type Scheduler, type CancellableScheduler, DelayScheduler, ImmediateScheduler, MacroScheduler, MicroScheduler}
export const Schedulers = {
    immediate: () => new ImmediateScheduler(),
    micro: () => new MicroScheduler(),
    macro: () => new MacroScheduler(),
    delay: (ms: number): DelayScheduler => new DelayScheduler(ms)
}


export {
    Mono,
    Flux,
    type Publisher,
    BackpressurePublisher,
    type PipePublisher,
    AbstractPipePublisher,
    type Subscription,
    type Subscriber
}

export {
    Base64,
    Json,
    Rc4,
    Sia,
    Stringify
}

export * from '@/utils'

export {
    Cache,
    // SyncCache,
    type CacheOptions,
    type OverflowPolicy,
    type RemoveReason,
    type StorageType
}

export {
    EventBus, EventBusContainer, EventPriority, Event, EventBusEvent
}
export {Reactive, default as reactive} from '@/utils/reactive'
export {peek, lazyPeek} from '@/utils/peek'