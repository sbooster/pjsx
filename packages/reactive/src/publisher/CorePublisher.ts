import Publisher from "@/publisher/Publisher";
import Subscriber from "../subscriber/Subscriber";
import Subscription from "../subscription/Subscription";
import {Listener, Signal, Sink} from "sinks";
import PipePublisher from "@/publisher/PipePublisher";
import Schedulers, {Scheduler} from "schedulers";

/**
 * Абстрактный класс для реализации издателя (Publisher), который обрабатывает подписчиков
 * и потоки данных. Класс предоставляет основные механизмы для подписки на поток данных,
 * обработки данных, ошибок и завершения потока.
 */
export default abstract class CorePublisher<T> implements PipePublisher<T> {
    protected sink: Sink<T>;
    protected readonly producer: (sink: Sink<T>, count: number) => void;

    /**
     * Конструктор для создания экземпляра издателя.
     *
     * @param producer - Функция, которая будет генерировать данные или события и передавать их в Sink.
     */
    protected constructor(producer: (sink: Sink<T>, count: number) => void) {
        this.sink = this.createSink();
        this.producer = producer;
    }

    /**
     * Абстрактный метод для создания Sink. Должен быть реализован в подклассе.
     *
     * @returns новый объект Sink для обработки данных.
     */
    protected abstract createSink(): Sink<T>;

    /**
     * Подписка на поток данных.
     * Позволяет подписчику получать данные, ошибки и завершение потока.
     *
     * @param subscriber - Функция или объект подписчика, который будет получать события.
     *  - Если передана функция, она будет обрабатывать только данные.
     *  - Если передан объект, то он должен реализовывать интерфейс `Subscriber<T>`.
     *
     * @returns Объект подписки с методами для запроса данных и отмены подписки.
     */
    public subscribe(subscriber?: ((data: T) => void) | Subscriber<T>): Subscription | void {
        const sub = CorePublisher.adaptSubscriber(subscriber || (() => {
        }));
        this.sink.addListener(sub)
        return {
            request: (count: number) => {
                this.producer(this.sink, count)
            },
            unsubscribe: () => {
                this.sink.removeListener(sub)
            }
        }
    }

    /**
     * Адаптирует подписчика, превращая его в Listener для работы с Sink.
     * Если подписчик является функцией, он будет адаптирован в объект с методами onNext, onError и onComplete.
     *
     * @param subscriber - Функция или объект подписчика.
     *
     * @returns Listener, который может быть передан в Sink для обработки событий.
     */
    protected static adaptSubscriber<T>(subscriber: ((data: T) => void) | Subscriber<T>): Listener<T> {
        subscriber = CorePublisher.normalizeSubscriber(subscriber)
        return (signal, data) => {
            switch (signal) {
                case Signal.DATA: {
                    subscriber.onNext(data as T)
                    break;
                }
                case Signal.ERROR: {
                    subscriber.onError(data as Error)
                    break;
                }
                case Signal.CLOSE: {
                    subscriber.onComplete()
                    break;
                }
            }
        }
    }

    protected static normalizeSubscriber<T>(subscriber: ((data: T) => void) | Subscriber<T>): Subscriber<T> {
        if (typeof subscriber == "function") {
            return {
                onNext: subscriber,
                onComplete() {
                    // TODO default complete handler
                },
                onError(error: Error) {
                    // TODO default error handler
                }
            } as Subscriber<T>
        }
        return subscriber
    }

    public pipe<U>(operation: (sink: Sink<U>, count: number) => ((data: T) => void) | Subscriber<T>, transit?: Sink<U>, scheduler: Scheduler = Schedulers.immediate()): CorePublisher<U> {
        return Reflect.construct(Reflect.getPrototypeOf(this).constructor, [(sink: Sink<U>, count: number) => {
            const subscriber = CorePublisher.normalizeSubscriber(operation(transit || sink, count));
            scheduler.schedule(() => {
                const soft = (fn: () => void) => {
                    try {
                        fn()
                    } catch (e) {
                        try {
                            (transit || sink).emitError(e);
                        } catch (e) {
                        }
                    }
                }
                (this.subscribe({
                    onNext(data: T) {
                        soft(() => subscriber.onNext ? subscriber.onNext(data) : (transit || sink).emitData(data as unknown as U))
                    },
                    onError(error: Error) {
                        soft(() => subscriber.onError ? subscriber.onError(error) : (transit || sink).emitError(error))
                    },
                    onComplete() {
                        soft(() => subscriber.onComplete ? subscriber.onComplete() : (transit || sink).emitClose())
                    }
                }) as Subscription)?.request(Number.MAX_SAFE_INTEGER)
            })
        }])
    }

    public map<U>(mapper: (value: T) => U): CorePublisher<U> {
        return this.pipe((sink) => {
            return data => {
                sink.emitData(mapper(data))
            }
        })
    }

    public mapNotNull<U>(mapper: (value: T) => U): CorePublisher<U> {
        return this.map(mapper).filter(value => value != null)
    }

    public abstract cast<U>(): CorePublisher<U>

    public doFirst(action: () => void): CorePublisher<T> {
        return this.pipe(sink => {
            try {
                action()
            } catch (e) {
                sink.emitError(e)
            }
            return {}
        })
    }

    public doOnNext(action: (value: T) => void): PipePublisher<T> {
        return this.map(value => {
            action(value);
            return value;
        })
    }

    public doFinally(action: () => void): PipePublisher<T> {
        return this.pipe(sink => {
            return {
                onComplete() {
                    try {
                        sink.emitClose()
                    } finally {
                        action()
                    }
                }
            }
        })
    }

    abstract filter(predicate: (value: T) => boolean): CorePublisher<T>

    public filterWhen(predicate: (value: T) => PipePublisher<boolean>): CorePublisher<T> {
        return this.flatMap(value => predicate(value)
            .filter(result => result)
            .map(() => value))
    }

    abstract flatMap<U>(mapper: (value: T) => PipePublisher<U>): CorePublisher<U>;

    abstract onErrorContinue(): CorePublisher<T>;

    public onErrorReturn(alternate: PipePublisher<T>): CorePublisher<T> {
        return this.pipe(sink => {
            return {
                onError() {
                    alternate.pipe(other => data => other.emitData(data), sink)
                        .subscribe()?.request(Number.MAX_SAFE_INTEGER)
                }
            }
        })
    }

    public publishOn(scheduler: Scheduler): CorePublisher<T> {
        return this.pipe(sink => {
            return {
                onNext(data: T) {
                    scheduler.schedule(() => sink.emitData(data))
                },
                onError(error: Error) {
                    scheduler.schedule(() => sink.emitError(error))
                },
                onComplete() {
                    scheduler.schedule(() => sink.emitClose())
                }
            }
        })
    }

    public subscribeOn(scheduler: Scheduler): CorePublisher<T> {
        return this.pipe(sink => {
            return {}
        }, null, scheduler)
    }

    abstract switchIfEmpty(alternate: Publisher<T>): CorePublisher<T>;

    public timeout(duration: number): CorePublisher<T> {
        return this.pipe(sink => {
            let scheduler = Schedulers.delay(duration).schedule(() => {
                try {
                    sink.emitError(new Error("Timeout"))
                } catch (e) {
                }
                scheduler = null;
            });
            const soft = (fn: () => void) => {
                if (scheduler != null) {
                    scheduler.cancel()
                    try {
                        fn();
                    } catch (e) {
                        try {
                            sink.emitError(e)
                        } catch (e) {
                        }
                    }
                }
            }
            return {
                onNext(data: T) {
                    soft(() => sink.emitData(data))
                },
                onError(error: Error) {
                    soft(() => sink.emitError(error))
                },
                onComplete() {
                    soft(() => sink.emitClose())
                }
            }
        })
    }
}