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

import {AbstractPipePublisher} from "@/publishers/pipe";
import {Publisher} from "@/publishers";
import {Sink} from "@/sinks";
import {Subscriber, Subscription} from "@/subscriptions";
import ManySink from "@/sinks/many";
import {Mono} from "@/publishers/mono";
import {Scheduler} from "@/schedulers";
import {combine} from "@/utils";
import json from "@/serializers/json";
import {MicroScheduler} from "@/schedulers/micro";
import {peek} from "@/utils/peek";
import {DelayScheduler} from "@/schedulers/delay";

export class Flux<T> extends AbstractPipePublisher<T> {
    protected constructor(publisher: Publisher<T>) {
        super(publisher)
    }

    public sinkType(): 'one' | 'many' {
        return 'many';
    }

    /**
     * Возвращает первый элемент потока как Mono.
     */
    public first(): Mono<T> {
        return Mono.generate(sink => {
            let sub: Subscription;
            (sub = this.subscribe({
                onNext(value: T) {
                    sink.next(value)
                    sub?.unsubscribe()
                },
                onError(error: Error) {
                    sink.error(error)
                },
                onComplete() {
                    sink.complete()
                }
            })).request(Number.MAX_SAFE_INTEGER)
        })
    }

    /**
     * Возвращает последний элемент потока как Mono.
     */
    public last(): Mono<T> {
        return Mono.generate(sink => {
            let lastValue: T | undefined
            this.subscribe({
                onNext(value: T): void {
                    lastValue = value
                },
                onError: sink.error,
                onComplete(): void {
                    if (lastValue !== undefined) sink.next(lastValue)
                    else sink.complete()
                }
            }).request(Number.MAX_SAFE_INTEGER)
        })
    }

    /**
     * Возвращает количество элементов в потоке.
     */
    public count(): Mono<number> {
        return this.collect().map(value => value.length)
    }

    /**
     * Проверяет наличие хотя бы одного элемента.
     */
    public hasElements(): Mono<boolean> {
        return this.count().map(value => value > 0)
    }

    /**
     * Собирает все элементы в массив и возвращает как Mono<T[]>.
     */
    public collect(force = false): Mono<T[]> {
        return Mono.generate(sink => {
            const buffer: T[] = []
            peek(this.subscribe({
                onNext(value: T): void {
                    buffer.push(value)
                },
                onError(error: Error): void {
                    sink.error(error)
                },
                onComplete(): void {
                    sink.next(buffer)
                }
            }))
                .peek(s => s.request(Number.MAX_SAFE_INTEGER))
                .peek(s => {
                    if (force) new MicroScheduler().schedule(() => {
                        try {
                            sink.next(buffer)
                        } catch (e) {
                        }
                        s.unsubscribe()
                    })
                })
        })
    }

    /**
     * Индексирует элементы потока: [index, value].
     */
    public indexed(): Flux<[number, T]> {
        let pipeSub: Subscription
        return this.pipe((onNext, onError, onComplete) => {
            let index = 0
            pipeSub = this.subscribe({
                onNext(value: T): void {
                    onNext([index++, value])
                },
                onError,
                onComplete
            })
        }, undefined, request => pipeSub?.request(request), () => pipeSub?.unsubscribe())
    }

    public skip(n: number): Flux<T> {
        return this.indexed()
            .filter(value => value[0] >= n)
            .map(value => value[1])
    }

    public skipWhile(predicate: (value: T) => boolean): Flux<T> {
        let pipeSub: Subscription
        return this.pipe((onNext, onError, onComplete) => {
            let skipping = true
            pipeSub = this.subscribe({
                onNext(value: T): void {
                    if (!skipping || !predicate(value)) {
                        skipping = false
                        onNext(value)
                    } else onNext(null as T)
                },
                onError,
                onComplete
            })
        }, undefined, request => pipeSub?.request(request), () => pipeSub?.unsubscribe())
    }

    public skipUntil(other: Publisher<any>): Flux<T> {
        let pipeSub: Subscription
        return this.pipe((onNext, onError, onComplete) => {
            let open = false;
            const sub = this.subscribe({
                onNext: (value) => {
                    if (open) onNext(value)
                    else onNext(null as T)
                },
                onError,
                onComplete
            })
            const sub2 = other.subscribe({
                onNext(value: any): void {
                    open = true
                },
                onError,
                onComplete(): void {
                }
            })
            pipeSub = {
                request(count: number) {
                    sub.request(count)
                    sub2.request(count)
                },
                unsubscribe() {
                    sub.unsubscribe()
                    sub2.unsubscribe()
                }
            } as Subscription
        }, undefined, request => pipeSub?.request(request), () => pipeSub?.unsubscribe())
    }

    public distinct(): Flux<T> {
        let sub: Subscription
        return this.pipe((onNext, onError, onComplete) => {
            const seen = new Set<T>()
            sub = this.subscribe({
                onNext: (value) => {
                    if (!seen.has(value)) {
                        seen.add(value)
                        onNext(value)
                    } else onNext(null as T)
                },
                onError,
                onComplete
            })
        }, undefined, request => sub?.request(request), () => sub?.unsubscribe())
    }

    public distinctUntilChanged(deep: boolean = true): Flux<T> {
        let sub: Subscription
        return this.pipe((onNext, onError, onComplete) => {
            let lastEmitted: string | T | null = null
            sub = this.subscribe({
                onNext(value: T) {
                    let val: T | string = value
                    if (deep) {
                        try {
                            val = json.serialize(value)
                        } catch (e) {
                            onError(e as Error)
                            return
                        }
                    }
                    if (lastEmitted != val) {
                        lastEmitted = val
                        onNext(value);
                    } else onNext(null as T)
                },
                onError(error: Error) {
                    onError(error)
                },
                onComplete() {
                    onComplete()
                }
            })
        }, undefined, request => sub?.request(request), () => sub?.unsubscribe())
    }

    public delayElements(ms: number): Flux<T> {
        let sub: Subscription
        return this.pipe((onNext, onError, onComplete) => {
            let promise = Promise.resolve()
            const emit = (fn: () => void) => {
                promise = promise.then(() => new Promise<void>(resolve => {
                    new DelayScheduler(ms).schedule(() => {
                        fn()
                        resolve()
                    })
                }))
            }
            sub = this.subscribe({
                onNext(value: T) {
                    emit(() => onNext(value))
                },
                onError(error: Error) {
                    emit(() => onError(error))
                },
                onComplete() {
                    emit(() => onComplete())
                }
            })
        }, undefined, request => sub?.request(request), () => sub?.unsubscribe())
    }

    public concatWith(other: Publisher<T>): Flux<T> {
        let pipeSub: Subscription
        return this.pipe((onNext, onError, onComplete) => {
            let second: Subscription | undefined
            const first = this.subscribe({
                onNext(value: T) {
                    onNext(value)
                },
                onError(error: Error) {
                    onError(error)
                },
                onComplete() {
                    second = other.subscribe({
                        onNext,
                        onError,
                        onComplete
                    })
                }
            })
            pipeSub = {
                request(count: number) {
                    first.request(count)
                    second?.request(count)
                },
                unsubscribe() {
                    first.unsubscribe()
                    second?.unsubscribe()
                }
            } as Subscription
        }, undefined, request => pipeSub?.request(request), () => pipeSub?.unsubscribe())
    }

    public mergeWith(other: Publisher<T>): Flux<T> {
        let pipeSub: Subscription
        return this.pipe((onNext, onError, onComplete) => {
            let left = 2
            const subscriber = {
                onNext,
                onError,
                onComplete() {
                    if (--left <= 0) {
                        onComplete()
                    }
                }
            } as Subscriber<T>
            const first = this.subscribe(subscriber)
            const second = other.subscribe(subscriber)
            pipeSub = {
                request(count: number) {
                    first.request(count)
                    second.request(count)
                },
                unsubscribe() {
                    first.unsubscribe()
                    second.unsubscribe()
                }
            } as Subscription
        }, undefined, request => pipeSub?.request(request), () => pipeSub?.unsubscribe())
    }

    public reduce(reducer: (acc: T, next: T) => T): Mono<T> {
        return this.collect().map(value => value.reduce(reducer))
    }

    public reduceWith<A>(seedFactory: () => A, reducer: (acc: A, next: T) => A): Mono<A> {
        return Mono.generate(sink => {
            let acc = seedFactory()
            this.subscribe({
                onNext(value: T) {
                    acc = reducer(acc, value)
                },
                onError(error: Error) {
                    sink.error(error)
                },
                onComplete() {
                    sink.next(acc)
                }
            }).request(Number.MAX_SAFE_INTEGER)
        })
    }

    public then(): Mono<void> {
        return Mono.generate(sink => {
            this.subscribe({
                onNext(value: T) {
                },
                onError(error: Error) {
                    sink.error(error)
                },
                onComplete() {
                    sink.complete()
                }
            }).request(Number.MAX_SAFE_INTEGER)
        })
    }

    public thenEmpty(other: Publisher<any>): Mono<void> {
        return Mono.generate(sink => {
            this.subscribe({
                onNext(value: T) {
                },
                onError(error: Error) {
                    sink.error(error)
                },
                onComplete() {
                    other.subscribe({
                        onNext(value: any) {
                        },
                        onError(error: Error) {
                            sink.error(error)
                        },
                        onComplete() {
                            sink.complete()
                        }
                    }).request(Number.MAX_SAFE_INTEGER)
                }
            }).request(Number.MAX_SAFE_INTEGER)
        })
    }

    // =========================================================================
    // =                            СТАТИЧЕСКИЕ МЕТОДЫ                         =
    // =========================================================================

    public static from<T>(publisher: Publisher<T>): Flux<T> {
        return Flux.generate(sink => {
            return publisher.subscribe({
                onNext(value: T) {
                    sink.next(value)
                },
                onError(error: Error) {
                    sink.error(error)
                },
                onComplete() {
                    sink.complete()
                }
            })
        })
    }

    public static generate<T>(generator: ((sink: Sink<T>) => void)): Flux<T> {
        return new Flux(combine(new ManySink<T>(), generator))
    }

    public static fromIterable<T>(iterable: Iterable<T>): Flux<T> {
        return Flux.generate(sink => {
            for (const value of iterable) {
                sink.next(value);
            }
            sink.complete();
        })
    }

    public static range(start: number, count: number): Flux<number> {
        return Flux.generate(sink => {
            let current = start;
            for (let i = 0; i < count; i++) {
                sink.next(current++);
            }
            sink.complete();
        })
    }

    public static empty<T = never>(): Flux<T> {
        return Flux.generate(sink => {
            sink.complete()
        })
    }

    public static defer<T>(factory: () => Flux<T>): Flux<T> {
        return Flux.generate(sink => factory().subscribe({
            onNext(value: T) {
                sink.next(value)
            },
            onError(error: Error) {
                sink.error(error)
            },
            onComplete() {
                sink.complete()
            }
        }))
    }

    public subscribe({
                         onNext = (value: T) => {
                         }, onError = (error: Error) => {
        }, onComplete = () => {
        }
                     } = {}): Subscription {
        return this.publisher.subscribe({onNext, onError, onComplete});
    }

    public override pipe<R>(producer: (onNext: (value: R) => void, onError: (error: Error) => void, onComplete: () => void) => void, onSubscribe?: (subscriber: Subscriber<R>) => void, onRequest?: (request: number) => void, onUnsubscribe?: () => void): Flux<R> {
        return super.pipe(producer, onSubscribe, onRequest, onUnsubscribe) as Flux<R>;
    }

    public override map<R>(fn: (value: T) => R): Flux<R> {
        return super.map(fn) as Flux<R>;
    }

    public override mapNotNull<R>(fn: (value: T) => (R | null | undefined)): Flux<R> {
        return super.mapNotNull(fn) as Flux<R>;
    }

    public override flatMap<R>(fn: (value: T) => Publisher<R>): Flux<R> {
        return super.flatMap(fn) as Flux<R>;
    }

    public override filter(predicate: (value: T) => boolean): Flux<T> {
        return super.filter(predicate) as Flux<T>;
    }

    public override filterWhen(predicate: (value: T) => Publisher<boolean>): Flux<T> {
        return super.filterWhen(predicate) as Flux<T>;
    }

    public override cast<R>(): Flux<R> {
        return super.cast() as Flux<R>;
    }

    public override switchIfEmpty(alternative: Publisher<T>): Flux<T> {
        return super.switchIfEmpty(alternative) as Flux<T>;
    }

    public override onErrorReturn(replacement: Publisher<T>): Flux<T> {
        return super.onErrorReturn(replacement) as Flux<T>;
    }

    public override onErrorContinue(predicate: (error: Error) => boolean): Flux<T> {
        return super.onErrorContinue(predicate) as Flux<T>;
    }

    public override doFirst(fn: () => void): Flux<T> {
        return super.doFirst(fn) as Flux<T>;
    }

    public override doOnNext(fn: (value: T) => void): Flux<T> {
        return super.doOnNext(fn) as Flux<T>;
    }

    public override doFinally(fn: () => void): Flux<T> {
        return super.doFinally(fn) as Flux<T>;
    }

    public override doOnSubscribe(fn: (subscriber: Subscriber<T>) => void): Flux<T> {
        return super.doOnSubscribe(fn) as Flux<T>;
    }

    public override publishOn(scheduler: Scheduler): Flux<T> {
        return super.publishOn(scheduler) as Flux<T>;
    }

    public override subscribeOn(scheduler: Scheduler): Flux<T> {
        return super.subscribeOn(scheduler) as Flux<T>;
    }
}