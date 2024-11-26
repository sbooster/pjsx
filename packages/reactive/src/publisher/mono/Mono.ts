import Subscriber from "@/subscriber/Subscriber";
import Subscription from "@/subscription/Subscription";
import Sinks, {Sink} from "sinks";
import PipePublisher from "@/publisher/PipePublisher";
import Schedulers, {Scheduler} from "schedulers";
import CorePublisher from "@/publisher/CorePublisher";

export default class Mono<T> extends CorePublisher<T> {
    constructor(producer: (sink: Sink<T>, count: number) => void) {
        super(producer);
    }

    public pipe<U>(operation: (sink: Sink<U>, count: number) => (((data: T) => void) | Subscriber<T>), transit?: Sink<U>, scheduler: Scheduler = Schedulers.immediate()): Mono<U> {
        return super.pipe(operation, transit, scheduler) as Mono<U>;
    }

    public map<U>(mapper: (value: T) => U): Mono<U> {
        return super.map(mapper) as Mono<U>;
    }

    public mapNotNull<U>(mapper: (value: T) => U): Mono<U> {
        return super.mapNotNull(mapper) as Mono<U>;
    }

    public doFirst(action: () => void): Mono<T> {
        return super.doFirst(action) as Mono<T>;
    }

    public doOnNext(action: (value: T) => void): Mono<T> {
        return super.doOnNext(action) as Mono<T>;
    }

    public doFinally(action: () => void): Mono<T> {
        return super.doFinally(action) as Mono<T>;
    }

    public flatMap<U>(mapper: (value: T) => Mono<U>): Mono<U> {
        return this.pipe(sink => {
            return {
                onNext(data: T) {
                    mapper(data)
                        .pipe(() => {
                            return {}
                        }, sink)
                        .subscribe()
                }
            }
        })
    }


    public onErrorReturn(alternate: PipePublisher<T>): Mono<T> {
        return super.onErrorReturn(alternate) as Mono<T>;
    }

    public publishOn(scheduler: Scheduler): Mono<T> {
        return super.publishOn(scheduler) as Mono<T>;
    }

    public subscribeOn(scheduler: Scheduler): Mono<T> {
        return super.subscribeOn(scheduler) as Mono<T>;
    }

    public timeout(duration: number): Mono<T> {
        return super.timeout(duration) as Mono<T>;
    }

    public static just<T>(value: T): Mono<T> {
        return new Mono((sink) => sink.emitData(value));
    }

    public static justOrEmpty<T>(value: T): Mono<T> {
        return value == null ? Mono.empty() : new Mono((sink) => sink.emitData(value));
    }

    public static error<T>(error: Error): Mono<T> {
        return new Mono<T>((sink) => sink.emitError(error));
    }

    public static empty<T>(): Mono<T> {
        return new Mono(sink => sink.emitClose());
    }

    public static fromPromise<T>(promise: Promise<T>): Mono<T> {
        return new Mono<T>((sink) => promise
            .then((value) => sink.emitData(value))
            .catch((error) => sink.emitError(error))
        );
    }

    public static defer<T>(producer: () => Mono<T>): Mono<T> {
        return new Mono<T>((sink) => {
            producer().pipe(() => {
                return {}
            }, sink).subscribe()
        });
    }

    protected createSink(): Sink<T> {
        return Sinks.one()
    }

    public cast<U>(): Mono<U> {
        return this as unknown as Mono<U>
    }

    public filter(predicate: (value: T) => boolean): Mono<T> {
        return this.pipe(sink => data => predicate(data) ? sink.emitData(data) : sink.emitClose())
    }

    public filterWhen(predicate: (value: T) => Mono<boolean>): Mono<T> {
        return super.filterWhen(predicate) as Mono<T>
    }

    public onErrorContinue(): Mono<T> {
        return this.onErrorReturn(Mono.empty())
    }

    public switchIfEmpty(alternate: Mono<T>): Mono<T> {
        return this.pipe(sink => {
            let empty = true;
            return {
                onNext(data: T) {
                    empty = false
                    sink.emitData(data)
                },
                onError(error: Error) {
                    empty = false
                    sink.emitError(error)
                },
                onComplete() {
                    if (empty) alternate.pipe(other => data => other.emitData(data), sink).subscribe()
                    else sink.emitClose()
                }
            }
        })
    }

    public zipWith<T2, R>(other: Mono<T2>, combiner: (value1: T, value2: T2) => R): Mono<R> {
        return this.zipWhen(() => other, combiner);
    }

    public zipWhen<T2, R>(fn: (value: T) => Mono<T2>, combiner: (value1: T, value2: T2) => R): Mono<R> {
        return this.flatMap(value => fn(value)
            .map(other => combiner(value, other)))
    }

    public hasElement(): Mono<boolean> {
        return this.map(() => true).switchIfEmpty(Mono.just(false));
    }

    public toPromise(): Promise<T> {
        return new Promise((resolve, reject) => {
            this.subscribe({
                onNext: resolve,
                onError: reject,
                onComplete: () => {
                },
            });
        });
    }

    public subscribe(subscriber?: ((data: T) => void) | Subscriber<T>): void {
        (super.subscribe(subscriber) as Subscription).request(1);
    }
}