import * as rxjs from 'rxjs'
import PipePublisher from "@/publisher/PipePublisher.ts";
import Mono from "@/publisher/mono";
import Subscriber from "@/subscriber/Subscriber.ts";
import {Signal, Sink, Sinks} from "sinks";
import {Scheduler} from "schedulers";
import Subscription from "@/subscription/Subscription.ts";

export default abstract class CorePublisher<T> implements PipePublisher<T> {
    protected readonly observable: rxjs.Observable<T>;

    protected constructor(observable: rxjs.Observable<T>) {
        this.observable = observable;
    }

    public abstract pipe<U>(operation: rxjs.OperatorFunction<T, U>): CorePublisher<U>

    public abstract cast<U>(): CorePublisher<U>

    protected abstract _produce(producer: (observer: rxjs.Subscriber<T>) => ((() => void) | any)): CorePublisher<T>

    public doFirst(action: () => void): CorePublisher<T> {
        return this._produce((observer) => {
            action();
            const subscription = this.observable.subscribe(observer);
            return () => subscription.unsubscribe();
        });
    }

    public publishOn(scheduler: Scheduler): CorePublisher<T> {
        return this._produce((observer) => this.subscribe({
            onNext(data: T) {
                scheduler.schedule(() => observer.next(data))
            },
            onError(error: Error) {
                scheduler.schedule(() => observer.error(error))
            },
            onComplete() {
                scheduler.schedule(() => observer.complete())
            }
        }));
    }


    public subscribeOn(scheduler: Scheduler): CorePublisher<T> {
        return this._produce((observer) => scheduler.schedule(() => this.subscribe({
            onNext(data: T) {
                observer.next(data)
            },
            onError(error: Error) {
                observer.error(error)
            },
            onComplete() {
                observer.complete()
            }
        })));
    }

    protected static adaptSink<T>(observer: rxjs.Subscriber<T>, sink: Sink<T>) {
        const listener = (signal: Signal, data: T | Error) => {
            switch (signal) {
                case Signal.DATA: {
                    observer.next(data as T)
                    break;
                }
                case Signal.ERROR: {
                    observer.error(data as Error)
                    break;
                }
                case Signal.CLOSE: {
                    observer.complete()
                    break;
                }
            }
        };
        sink.addListener(listener)
        return () => sink.removeListener(listener);
    }

    public map<U>(mapper: (value: T) => U): CorePublisher<U> {
        return this.pipe(rxjs.map(mapper));
    }

    public mapNotNull<U>(mapper: (value: T) => U | null): CorePublisher<U> {
        return this.flatMap(value => Mono.justOrEmpty(mapper(value)));
    }

    public flatMap<U>(mapper: (value: T) => PipePublisher<U>): CorePublisher<U> {
        return this.pipe(rxjs.switchMap((value: T) => (mapper(value) as Mono<U>).observable));
    }

    public filter(predicate: (value: T) => boolean): CorePublisher<T> {
        return this.pipe(rxjs.filter(predicate));
    }

    public filterWhen(predicate: (value: T) => PipePublisher<boolean>): CorePublisher<T> {
        return this.flatMap(value => predicate(value).filter(Boolean).map(() => value));
    }

    public switchIfEmpty(alternate: PipePublisher<T>): CorePublisher<T> {
        return this.pipe(rxjs.defaultIfEmpty(null))
            .flatMap(value => value == null ? alternate : Mono.just(value))
    }

    public onErrorReturn(alternate: PipePublisher<T>): CorePublisher<T> {
        return this.pipe(rxjs.catchError(() => (alternate as Mono<T>).observable));
    }

    public onErrorContinue(): CorePublisher<T> {
        return this.onErrorReturn(Mono.empty())
    }

    public doOnNext(action: (value: T) => void): CorePublisher<T> {
        return this.pipe(rxjs.tap(action));
    }

    public doFinally(action: () => void): CorePublisher<T> {
        return this.pipe(rxjs.finalize(action));
    }

    public timeout(duration: number): CorePublisher<T> {
        return this.pipe(rxjs.timeout(duration));
    }

    public subscribe(subscriber?: Subscriber<T> | ((data: T) => void)): Subscription | void {
        if (typeof subscriber === "function") {
            subscriber = {onNext: subscriber} as Subscriber<T>;
        }
        const sink = Sinks.many().multicast<T>();
        const listener = (signal: Signal, data: T | Error) => {
            switch (signal) {
                case Signal.DATA: {
                    subscriber?.onNext?.(data as T);
                    break;
                }
                case Signal.ERROR: {
                    subscriber?.onError?.(data as Error);
                    break;
                }
                case Signal.CLOSE: {
                    subscriber?.onComplete?.();
                    break;
                }
            }
        };
        const buffer = sink.buffer();
        buffer.addListener(listener);
        let subscription: rxjs.Subscription | undefined
        return {
            request: (count: number) => {
                if (count > 0) {
                    if (subscription == null) {
                        subscription = this.observable.subscribe({
                            next: (value: T) => sink.emitData(value),
                            error: (error) => sink.emitError(error),
                            complete: () => sink.emitClose()
                        })
                    }
                    buffer.request(count)
                }
            },
            unsubscribe: () => {
                subscription?.unsubscribe();
                buffer.removeListener(listener)
            }
        }
    }
}