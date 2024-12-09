import PipePublisher from "@/publisher/PipePublisher";
import * as rxjs from "rxjs";
import {Sink} from "sinks";
import Mono from "@/publisher/mono";
import CorePublisher from "@/publisher/CorePublisher.ts";
import {Scheduler} from "schedulers";
import Subscriber from "@/subscriber/Subscriber.ts";
import Subscription from "@/subscription/Subscription.ts";

export default class Flux<T> extends CorePublisher<T> {
    public static from<T>(sink: Sink<T>): Flux<T> {
        return Flux.fromObservable(new rxjs.Observable<T>((observer) => CorePublisher.adaptSink(observer, sink)));
    }

    public static fromIterable<T>(iterable: Iterable<T>): Flux<T> {
        return Flux.fromObservable(rxjs.from(iterable));
    }

    public static empty<T>(): Flux<T> {
        return Flux.fromObservable(rxjs.EMPTY);
    }

    public static range(start: number, count: number): Flux<number> {
        return Flux.fromObservable(rxjs.range(start, count));
    }

    public static fromObservable<T>(observable: rxjs.Observable<T>): Flux<T> {
        return new Flux(observable);
    }

    public static defer<T>(producer: () => Flux<T>): Flux<T> {
        return Flux.fromObservable(rxjs.defer(() => producer().observable));
    }

    public static produce<T>(producer: (observer: rxjs.Subscriber<T>) => ((() => void) | any)): Flux<T> {
        return Flux.fromObservable(new rxjs.Observable<T>((observer) => producer(observer)));
    }

    public pipe<U>(operation: rxjs.OperatorFunction<T, U>): Flux<U> {
        return Flux.fromObservable(this.observable.pipe(operation));
    }

    protected _produce(producer: (observer: rxjs.Subscriber<T>) => any): CorePublisher<T> {
        return Flux.produce(producer);
    }

    public cast<U>(): Flux<U> {
        return this as unknown as Flux<U>;
    }

    public take(count: number) {
        return this.pipe(rxjs.take(count))
    }

    public first(): Mono<T> {
        return Mono.fromObservable(this.take(1).observable);
    }

    public collect(): Mono<Array<T>> {
        return Mono.fromObservable(this.pipe(rxjs.reduce((acc, value) => [...acc, value], [])).observable);
    }

    public concatWith(other: PipePublisher<T>): Flux<T> {
        return this.pipe(rxjs.concatMap(() => (other as Flux<T>).observable));
    }

    public concatWithIterable(other: Iterable<T>): Flux<T> {
        return this.concatWith(Flux.defer(() => Flux.fromIterable(other)));
    }

    public count(): Mono<number> {
        return this.collect().map(value => value.length)
    }

    public delayElements(duration: number): Flux<T> {
        return this.pipe(rxjs.delay(duration));
    }

    public distinct(): Flux<T> {
        return this.pipe(rxjs.distinct());
    }

    public distinctUntilChanged(): Flux<T> {
        return this.pipe(rxjs.distinctUntilChanged());
    }

    public groupBy<K>(keySelector: (value: T) => K): Flux<rxjs.GroupedObservable<K, T>> {
        return this.pipe(rxjs.groupBy(keySelector))
    }

    public groupJoin<R>(other: Flux<R>, joinCondition: (left: T, right: R) => boolean): Flux<{
        key: T,
        values: Array<R>
    }> {
        return this.pipe(rxjs.mergeMap(left => other.filter(right => joinCondition(left, right))
            .map(right => ({key: left, values: [right]})).observable
        ))
    }

    public hasElement(predicate: (value: T) => boolean): Mono<boolean> {
        return Mono.fromObservable(this.filter(predicate)
            .take(1)
            .map(() => true)
            .switchIfEmpty(Mono.just(false))
            .observable);
    }

    public hasElements(): Mono<boolean> {
        return this.hasElement(() => true);
    }

    public indexed(): Flux<{ index: number, value: T }> {
        return this.pipe(rxjs.map((value, index) => ({index, value})));
    }

    public join<U>(other: Flux<U>): Flux<{ left: T, right: U }> {
        return this.pipe(rxjs.mergeMap((left) => other.map((right) => ({left, right})).observable))
    }

    public last(): Mono<T> {
        return Mono.fromObservable(this.pipe(rxjs.last()).observable);
    }

    public mergeWith(other: PipePublisher<T>): Flux<T> {
        return Flux.fromObservable<T>(rxjs.merge(this.observable, (other as Flux<T>).observable));
    }

    public reduce<U>(accumulator: (acc: U, value: T) => U, initial: U): Mono<U> {
        return Mono.fromObservable(this.pipe(rxjs.reduce(accumulator, initial)).observable);
    }

    public reduceWith<U>(accumulator: (acc: U, value: T) => U, supplier: () => U): Mono<U> {
        return this.reduce(accumulator, supplier());
    }

    public skip(n: number): Flux<T> {
        return this.pipe(rxjs.skip(n));
    }

    public skipLast(n: number): Flux<T> {
        return this.pipe(rxjs.skipLast(n));
    }

    public skipUntil(other: PipePublisher<any>): Flux<T> {
        return this.pipe(rxjs.skipUntil((other as Flux<any>).observable));
    }

    public skipUntilOther(other: PipePublisher<any>): Flux<T> {
        // todo тут нужно skip до тех пор, пока other не завершен
        return this.pipe(rxjs.skipUntil((other as Flux<any>).observable));
    }

    public skipWhile(predicate: (value: T) => boolean): Flux<T> {
        return this.pipe(rxjs.skipWhile(predicate));
    }

    public then(other: PipePublisher<T>): Flux<T> {
        return this.pipe(rxjs.concatMap(() => (other as Flux<T>).observable));
    }

    public thenEmpty(): Flux<T> {
        return this.then(Flux.empty())
    }


    public doFirst(action: () => void): Flux<T> {
        return super.doFirst(action) as Flux<T>;
    }

    public publishOn(scheduler: Scheduler): Flux<T> {
        return super.publishOn(scheduler) as Flux<T>;
    }

    public subscribeOn(scheduler: Scheduler): Flux<T> {
        return super.subscribeOn(scheduler) as Flux<T>;
    }

    public map<U>(mapper: (value: T) => U): Flux<U> {
        return super.map(mapper) as Flux<U>;
    }

    public mapNotNull<U>(mapper: (value: T) => (U | null)): Flux<U> {
        return super.mapNotNull(mapper) as Flux<U>;
    }

    public flatMap<U>(mapper: (value: T) => PipePublisher<U>): Flux<U> {
        return super.flatMap(mapper) as Flux<U>;
    }

    public filter(predicate: (value: T) => boolean): Flux<T> {
        return super.filter(predicate) as Flux<T>;
    }

    public filterWhen(predicate: (value: T) => PipePublisher<boolean>): Flux<T> {
        return super.filterWhen(predicate) as Flux<T>;
    }

    public switchIfEmpty(alternate: PipePublisher<T>): Flux<T> {
        return super.switchIfEmpty(alternate) as Flux<T>;
    }

    public onErrorReturn(alternate: PipePublisher<T>): Flux<T> {
        return super.onErrorReturn(alternate) as Flux<T>;
    }

    public onErrorContinue(): Flux<T> {
        return super.onErrorContinue() as Flux<T>;
    }

    public doOnNext(action: (value: T) => void): Flux<T> {
        return super.doOnNext(action) as Flux<T>;
    }

    public doFinally(action: () => void): Flux<T> {
        return super.doFinally(action) as Flux<T>;
    }

    public timeout(duration: number): Flux<T> {
        return super.timeout(duration) as Flux<T>;
    }

    public subscribe(subscriber?: Subscriber<T> | ((data: T) => void)): Subscription {
        return super.subscribe(subscriber) as Subscription;
    }
}