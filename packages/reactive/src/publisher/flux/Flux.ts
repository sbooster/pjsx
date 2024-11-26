import CorePublisher from "@/publisher/CorePublisher";
import Sinks, {Sink} from "sinks";
import Subscriber from "@/subscriber/Subscriber";
import Subscription from "@/subscription/Subscription";
import Mono from "@/publisher/mono/Mono";
import Schedulers, {Scheduler} from "schedulers";
import PipePublisher from "@/publisher/PipePublisher";
import Publisher from "@/publisher/Publisher";

export default class Flux<T> extends CorePublisher<T> {
    constructor(producer: (sink: Sink<T>, count: number) => void) {
        super(producer);
    }

    public static from<T>(sink: Sink<T>): Flux<T> {
        return new Flux<T>((inner) => {
            sink.addListener(Flux.adaptSubscriber({
                onNext(data: T): void {
                    inner.emitData(data)
                },
                onError(error: Error): void {
                    inner.emitError(error)
                },
                onComplete(): void {
                    inner.emitClose()
                }
            }))
        });
    }

    public static fromIterable<T>(iterable: Iterable<T>): Flux<T> {
        return new Flux((sink) => {
            for (const item of iterable) {
                sink.emitData(item);
            }
            sink.emitClose();
        })
    }

    public static defer<T>(producer: () => Flux<T>): Flux<T> {
        return new Flux<T>((sink) => {
            producer().pipe(() => {
                return {}
            }, sink).subscribe()?.request(Number.MAX_SAFE_INTEGER)
        });
    }

    protected createSink(): Sink<T> {
        return Sinks.many().unicast();
    }

    public cast<U>(): Flux<U> {
        return this as unknown as Flux<U>
    }

    public filter(predicate: (value: T) => boolean): Flux<T> {
        return this.pipe(sink => data => predicate(data) ? sink.emitData(data) : undefined)
    }

    public onErrorContinue(): Flux<T> {
        throw new Error("Method not implemented.");
    }

    public switchIfEmpty(alternate: Publisher<T>): Flux<T> {
        throw new Error("Method not implemented.");
    }

    public first(): Mono<T> {
        return new Mono(sink => {
            const soft = (fn: () => void) => {
                try {
                    fn()
                } catch (e) {
                    try {
                        sink.emitError(e);
                    } catch (e) {
                    }
                }
            }
            this.subscribe({
                onNext(data: T) {
                    soft(() => sink.emitData(data))
                },
                onError(error: Error) {
                    soft(() => sink.emitError(error))
                },
                onComplete() {
                    soft(() => sink.emitClose())
                }
            }).request(1)
        })
    }

    public subscribe(subscriber?: ((data: T) => void) | Subscriber<T>): Subscription {
        const sub = CorePublisher.adaptSubscriber(subscriber || (() => {
        }));
        let buffer = this.sink.buffer();
        buffer.addListener(sub)
        let produceOnce = (count: number) => {
            this.producer(this.sink, count)
            produceOnce = () => {
            }
        }
        return {
            request: (count: number) => {
                produceOnce(count)
                buffer.request(count)
            },
            unsubscribe: () => {
                buffer.removeListener(sub)
            }
        }
    }

    public pipe<U>(operation: (sink: Sink<U>, count: number) => (((data: T) => void) | Subscriber<T>), transit?: Sink<U>, scheduler: Scheduler = Schedulers.immediate()): Flux<U> {
        return super.pipe(operation, transit, scheduler) as Flux<U>;
    }

    public map<U>(mapper: (value: T) => U): Flux<U> {
        return super.map(mapper) as Flux<U>;
    }

    public mapNotNull<U>(mapper: (value: T) => U): Flux<U> {
        return super.mapNotNull(mapper) as Flux<U>;
    }

    public doFirst(action: () => void): Flux<T> {
        return super.doFirst(action) as Flux<T>;
    }

    public doOnNext(action: (value: T) => void): Flux<T> {
        return super.doOnNext(action) as Flux<T>;
    }

    public doFinally(action: () => void): Flux<T> {
        return super.doFinally(action) as Flux<T>;
    }

    public filterWhen(predicate: (value: T) => Mono<boolean>): Flux<T> {
        return super.filterWhen(predicate) as Flux<T>;
    }

    public flatMap<U>(mapper: (value: T) => PipePublisher<U>): Flux<U> {
        return this.pipe(sink => {
            return {
                onNext(data: T) {
                    mapper(data)
                        .pipe((other) => {
                            return {
                                onComplete() {
                                    other.emitClose()
                                }
                            }
                        }, sink)
                        .subscribe()?.request(Number.MAX_SAFE_INTEGER)
                }
            }
        })
    }

    public onErrorReturn(alternate: Flux<T>): Flux<T> {
        return super.onErrorReturn(alternate) as Flux<T>;
    }

    public publishOn(scheduler: Scheduler): Flux<T> {
        return super.publishOn(scheduler) as Flux<T>;
    }

    public subscribeOn(scheduler: Scheduler): Flux<T> {
        return super.subscribeOn(scheduler) as Flux<T>;
    }

    public timeout(duration: number): Flux<T> {
        return super.timeout(duration) as Flux<T>;
    }
}