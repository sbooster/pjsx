import CorePublisher from "@/publisher/CorePublisher";
import Sinks, {Signal, Sink} from "sinks";
import Subscriber from "@/subscriber/Subscriber";
import Subscription from "@/subscription/Subscription";
import {Publisher} from "@/index";
import Mono from "@/publisher/mono/Mono";

export default class Flux<T> extends CorePublisher<T> {

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
            producer().subscribe({
                onNext(data: T) {
                    sink.emitData(data)
                },
                onError(error: Error) {
                    sink.emitError(error)
                },
                onComplete() {
                    sink.emitClose()
                }
            }).request(Number.MAX_SAFE_INTEGER)
        });
    }

    public pipe<U>(fn: (sink: Sink<U>, count: number) => ((data: T) => void) | Subscriber<T>) {
        return new Flux<U>((sink, count) => {
            this.subscribe(CorePublisher.normalizeSubscriber(fn(sink, count))).request(Number.MAX_SAFE_INTEGER)
        })
    }

    public map<U>(mapper: (value: T) => U): Flux<U> {
        return this.pipe(sink => {
            return {
                onNext(data: T) {
                    sink.emitData(mapper(data))
                },
                onError(error: Error) {
                    sink.emitError(error)
                },
                onComplete() {
                    sink.emitClose()
                }
            }
        })
    }

    public mapNotNull<U>(mapper: (value: T) => U): Flux<U> {
        return this.map(mapper).filter(value => value != null)
    }

    public flatMap<U>(mapper: (value: T) => Publisher<U>): Flux<U> {
        return this.pipe((sink) => {
            return {
                onNext(data: T) {
                    mapper(data)
                        .subscribe({
                            onNext(data: U) {
                                sink.emitData(data)
                            },
                            onError(error: Error) {
                                sink.emitError(error)
                            },
                            onComplete() {
                                // TODO do nothing
                            }
                        })?.request(Number.MAX_SAFE_INTEGER)
                },
                onError(error: Error) {
                    sink.emitError(error)
                },
                onComplete() {
                    sink.emitClose()
                }
            }
        })
    }

    public filter(predicate: (value: T) => boolean): Flux<T> {
        return new Flux<T>((sink) => {
            this.subscribe({
                onNext(data: T) {
                    if (predicate(data)) sink.emitData(data)
                    // TODO emit nothing
                },
                onError(error: Error) {
                    sink.emitError(error)
                },
                onComplete() {
                    sink.emitClose()
                }
            }).request(Number.MAX_SAFE_INTEGER)
        })
    }

    public filterWhen(predicate: (value: T) => Publisher<boolean>): Flux<T> {
        return this.flatMap(value => {
            let pub = predicate(value);
            if (pub instanceof Flux) {
                pub = pub.first()
            }
            return pub
                .filter(result => result)
                .map(() => value)
        })
    }

    public first(): Mono<T> {
        return new Mono(sink => {
            this.subscribe({
                onNext(data: T) {
                    try {
                        sink.emitData(data)
                    } catch (e) {
                        try {
                            sink.emitError(e);
                        } catch (e) {
                        }
                    }
                },
                onError(error: Error) {
                    try {
                        sink.emitError(error)
                    } catch (e) {
                        try {
                            sink.emitError(e);
                        } catch (e) {
                        }
                    }
                },
                onComplete() {
                    try {
                        sink.emitClose()
                    } catch (e) {
                        try {
                            sink.emitError(e);
                        } catch (e) {
                        }
                    }
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

    protected createSink(): Sink<T> {
        return Sinks.many().unicast()
    }
}