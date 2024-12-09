import {Scheduler} from "schedulers";
import * as rxjs from 'rxjs'
import Subscriber from "@/subscriber/Subscriber.ts";
import CorePublisher from "@/publisher/CorePublisher.ts";
import {Signal, Sink} from "sinks";
import PipePublisher from "@/publisher/PipePublisher.ts";
import Subscription from "@/subscription/Subscription.ts";

export default class Mono<T> extends CorePublisher<T> {
    constructor(observable: rxjs.Observable<T>) {
        super(observable);
    }

    public static just<T>(value: T): Mono<T> {
        return Mono.fromObservable(rxjs.of(value));
    }

    public static justOrEmpty<T>(value: T): Mono<T> {
        return value != null ? Mono.just(value) : Mono.empty();
    }

    public static error<T>(error: Error): Mono<T> {
        return Mono.fromObservable(rxjs.throwError(() => error));
    }

    public static empty<T>(): Mono<T> {
        return Mono.fromObservable(rxjs.EMPTY);
    }

    public static fromPromise<T>(promise: Promise<T>): Mono<T> {
        return Mono.fromObservable(rxjs.from(promise));
    }

    public static fromObservable<T>(observable: rxjs.Observable<T>): Mono<T> {
        return new Mono(observable);
    }

    public static defer<T>(producer: () => Mono<T>): Mono<T> {
        return Mono.fromObservable(rxjs.defer(() => producer().observable));
    }

    public static from<T>(sink: Sink<T>): Mono<T> {
        return Mono.produce(observer => CorePublisher.adaptSink(observer, sink))
    }

    public static produce<T>(producer: (observer: rxjs.Subscriber<T>) => ((() => void) | any)): Mono<T> {
        return Mono.fromObservable(new rxjs.Observable<T>((observer) => producer(observer)));
    }

    public pipe<U>(operation: rxjs.OperatorFunction<T, U>): Mono<U> {
        return Mono.fromObservable(this.observable.pipe(operation));
    }

    protected _produce(producer: (observer: rxjs.Subscriber<T>) => any): Mono<T> {
        return Mono.produce(producer) as Mono<T>;
    }

    public zipWith<T2, R>(other: Mono<T2>, combiner: (value1: T, value2: T2) => R): Mono<R> {
        return this.zipWhen(() => other, combiner);
    }

    public zipWhen<T2, R>(fn: (value: T) => Mono<T2>, combiner: (value1: T, value2: T2) => R): Mono<R> {
        return this.flatMap(value => fn(value).map(other => combiner(value, other)))
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

    public cast<U>(): Mono<U> {
        return this as unknown as Mono<U>;
    }

    public doFirst(action: () => void): Mono<T> {
        return super.doFirst(action) as Mono<T>;
    }

    public publishOn(scheduler: Scheduler): Mono<T> {
        return super.publishOn(scheduler) as Mono<T>;
    }

    public subscribeOn(scheduler: Scheduler): Mono<T> {
        return super.subscribeOn(scheduler) as Mono<T>;
    }

    public map<U>(mapper: (value: T) => U): Mono<U> {
        return super.map(mapper) as Mono<U>;
    }

    public mapNotNull<U>(mapper: (value: T) => (U | null)): Mono<U> {
        return super.mapNotNull(mapper) as Mono<U>;
    }

    public flatMap<U>(mapper: (value: T) => PipePublisher<U>): Mono<U> {
        return super.flatMap(mapper) as Mono<U>;
    }

    public filter(predicate: (value: T) => boolean): Mono<T> {
        return super.filter(predicate) as Mono<T>;
    }

    public filterWhen(predicate: (value: T) => PipePublisher<boolean>): Mono<T> {
        return super.filterWhen(predicate) as Mono<T>;
    }

    public switchIfEmpty(alternate: PipePublisher<T>): Mono<T> {
        return super.switchIfEmpty(alternate) as Mono<T>;
    }

    public onErrorReturn(alternate: PipePublisher<T>): Mono<T> {
        return super.onErrorReturn(alternate) as Mono<T>;
    }

    public onErrorContinue(): Mono<T> {
        return super.onErrorContinue() as Mono<T>;
    }

    public doOnNext(action: (value: T) => void): Mono<T> {
        return super.doOnNext(action) as Mono<T>;
    }

    public doFinally(action: () => void): Mono<T> {
        return super.doFinally(action) as Mono<T>;
    }

    public timeout(duration: number): Mono<T> {
        return super.timeout(duration) as Mono<T>;
    }

    public subscribe(subscriber?: Subscriber<T> | ((data: T) => void)): void {
        (super.subscribe(subscriber) as Subscription)?.request?.(1)
    }
}