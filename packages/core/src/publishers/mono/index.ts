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
import {Subscriber, Subscription} from "@/subscriptions";
import OneSink from "@/sinks/one";
import {Sink} from "@/sinks";
import {Scheduler} from "@/schedulers";
import {combine} from "@/utils";
import {Flux} from "@/publishers/flux";
import {lazyPeek, peek} from "@/utils/peek";

/**
 * Реактивный Publisher, испускающий максимум одно значение или завершение.
 */
export class Mono<T> extends AbstractPipePublisher<T> {
    protected constructor(publisher: Publisher<T>) {
        super(publisher)
    }

    public static from<T>(publisher: Publisher<T>): Mono<T> {
        return Mono.generate(sink =>
            lazyPeek<Subscription>((self) => publisher.subscribe({
                onNext(value: T) {
                    sink.next(value)
                    self().unsubscribe()
                },
                onError(error: Error) {
                    sink.error(error)
                    self().unsubscribe()
                },
                onComplete() {
                    sink.complete()
                    self().unsubscribe()
                }
            })).get()
        )
    }

    public static generate<T>(generator: ((sink: Sink<T>) => void)): Mono<T> {
        return new Mono(combine(new OneSink<T>(), generator))
    }


    // =========================================================================
    // =                            Статические фабрики                        =
    // =========================================================================

    /**
     * Возвращает Mono, испускающий одно значение и завершающийся.
     *
     * @example
     * Mono.just(42).subscribe(...)
     */
    public static just<T>(value: T): Mono<T> {
        return Mono.generate(sink => sink.next(value))
    }

    /**
     * Возвращает пустой Mono (только onComplete).
     *
     * @example
     * Mono.empty().subscribe(...)
     */
    public static empty<T = never>(): Mono<T> {
        return Mono.generate(sink => sink.complete())
    }

    /**
     * Возвращает Mono, испускающий только ошибку.
     *
     * @example
     * Mono.error(new Error("Oops")).subscribe(...)
     */
    public static error<T = never>(error: any): Mono<T> {
        return Mono.generate(sink => sink.error(error))
    }

    /**
     * Возвращает Mono.just(value), если value != null, иначе Mono.empty().
     *
     * @example
     * Mono.justOrEmpty(null) → Mono.empty()
     */
    public static justOrEmpty<T>(value: T | null | undefined): Mono<T> {
        return value == null ? Mono.empty() : Mono.just(value)
    }

    /**
     * Преобразует Promise в Mono.
     *
     * - resolve → onNext(value), onComplete
     * - reject → onError(error)
     *
     * @example
     * Mono.fromPromise(fetch(...)).subscribe(...)
     */
    public static fromPromise<T>(promise: Promise<T>): Mono<T> {
        return Mono.generate(sink => promise
            .then((value) => sink.next(value))
            .catch((err) => sink.error(err)))
    }

    /**
     * Создаёт Mono, который инициализируется лениво при подписке.
     *
     * @example
     * Mono.defer(() => Mono.just(Date.now()))
     */
    public static defer<T>(factory: () => Mono<T>): Mono<T> {
        return Mono.generate(sink => factory().subscribe({
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

    /**
     * Подписывает подписчика на обёрнутый Publisher.
     */

    public subscribe({
                         onNext = (value: T) => {
                         },
                         onError = (error: Error) => {
                         },
                         onComplete = () => {
                         }
                     } = {}): Subscription {
        return peek(this.publisher.subscribe({onNext, onError, onComplete})).peek(val => val.request(1)).get()
    }

    public sinkType(): 'one' | 'many' {
        return 'one';
    }

    // =========================================================================
    // =                             INSTANCE-МЕТОДЫ                            =
    // =========================================================================

    /**
     * Преобразует Mono<T> в Flux<R> через маппер.
     */
    public flatMapMany<R>(mapper: (value: T) => Publisher<R>): Flux<R> {
        return Flux.generate(sink => {
            let subscription: Subscription | undefined
            this.subscribe({
                onNext: (val) => {
                    subscription = mapper(val).subscribe({
                        onNext(value: R) {
                            sink.next(value)
                        },
                        onError(error: Error) {
                            sink.error(error)
                        },
                        onComplete() {
                            sink.complete()
                        }
                    })
                },
                onError: (error) => {
                    sink.error(error)
                },
                onComplete: () => {
                    if (subscription == null) sink.complete()
                }
            })
            return {
                request(count: number) {
                    subscription?.request(count)
                },
                unsubscribe() {
                    subscription?.unsubscribe()
                }
            } as Subscription
        })
    }

    /**
     * Объединяет два Mono в Mono<[T, R]>.
     */
    public zipWith<R>(other: Mono<R>): Mono<[T, R]> {
        return this.flatMap(left => other.map(right => [left, right]))
    }

    /**
     * Комбинирует Mono<T> с результатом fn(value): Mono<R>.
     */
    public zipWhen<R>(fn: (value: T) => Mono<R>): Mono<[T, R]> {
        return this.flatMap((left) => fn(left).map((right) => [left, right]))
    }

    /**
     * Проверяет, содержит ли Mono значение.
     */
    public hasElement(): Mono<boolean> {
        return this.onErrorContinue(_error => true)
            .map(_value => true)
            .switchIfEmpty(Mono.defer(() => Mono.just(false)))
    }

    /**
     * Преобразует Mono<T> в Promise<T | null>.
     */
    public toPromise(): Promise<T | null> {
        return new Promise((resolve, reject) => {
            let value: T | null = null
            this.subscribe({
                onNext: (v) => value = v,
                onError: reject,
                onComplete: () => resolve(value)
            })
        })
    }


    public override pipe<R>(producer: (onNext: (value: R) => void, onError: (error: Error) => void, onComplete: () => void) => void, onSubscribe?: (subscriber: Subscriber<R>) => void, onRequest?: (request: number) => void, onUnsubscribe?: () => void): Mono<R> {
        return super.pipe(producer, onSubscribe, onRequest, onUnsubscribe) as Mono<R>;
    }

    public override map<R>(fn: (value: T) => R): Mono<R> {
        return super.map(fn) as Mono<R>;
    }

    public override mapNotNull<R>(fn: (value: T) => (R | null | undefined)): Mono<R> {
        return super.mapNotNull(fn) as Mono<R>;
    }

    public override flatMap<R>(fn: (value: T) => Publisher<R>): Mono<R> {
        return super.flatMap(fn) as Mono<R>;
    }

    public override filter(predicate: (value: T) => boolean): Mono<T> {
        return super.filter(predicate) as Mono<T>;
    }

    public override filterWhen(predicate: (value: T) => Publisher<boolean>): Mono<T> {
        return super.filterWhen(predicate) as Mono<T>;
    }

    public override cast<R>(): Mono<R> {
        return super.cast() as Mono<R>;
    }

    public override switchIfEmpty(alternative: Publisher<T>): Mono<T> {
        return super.switchIfEmpty(alternative) as Mono<T>;
    }

    public override onErrorReturn(replacement: Publisher<T>): Mono<T> {
        return super.onErrorReturn(replacement) as Mono<T>;
    }

    public override onErrorContinue(predicate: (error: Error) => boolean): Mono<T> {
        return super.onErrorContinue(predicate) as Mono<T>;
    }

    public override doFirst(fn: () => void): Mono<T> {
        return super.doFirst(fn) as Mono<T>;
    }

    public override doOnNext(fn: (value: T) => void): Mono<T> {
        return super.doOnNext(fn) as Mono<T>;
    }

    public override doFinally(fn: () => void): Mono<T> {
        return super.doFinally(fn) as Mono<T>;
    }

    public override doOnSubscribe(fn: (subscriber: Subscriber<T>) => void): Mono<T> {
        return super.doOnSubscribe(fn) as Mono<T>;
    }

    public override publishOn(scheduler: Scheduler): Mono<T> {
        return super.publishOn(scheduler) as Mono<T>;
    }

    public override subscribeOn(scheduler: Scheduler): Mono<T> {
        return super.subscribeOn(scheduler) as Mono<T>;
    }
}
