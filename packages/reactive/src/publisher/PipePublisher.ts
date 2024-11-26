import Subscriber from "@/subscriber/Subscriber";
import Publisher from "@/publisher/Publisher";
import {Scheduler} from "schedulers";
import {Sink} from "sinks";

export default interface PipePublisher<T> extends Publisher<T> {
    pipe<U>(operation: (sink: Sink<U>, count: number) => ((data: T) => void) | Subscriber<T>, transit?: Sink<U>, scheduler?: Scheduler): PipePublisher<U>

    map<U>(mapper: (value: T) => U): PipePublisher<U>

    mapNotNull<U>(mapper: (value: T) => U): PipePublisher<U>

    flatMap<U>(mapper: (value: T) => PipePublisher<U>): PipePublisher<U>

    filter(predicate: (value: T) => boolean): PipePublisher<T>

    filterWhen(predicate: (value: T) => PipePublisher<boolean>): PipePublisher<T>

    switchIfEmpty(alternate: PipePublisher<T>): PipePublisher<T>

    onErrorReturn(alternate: PipePublisher<T>): PipePublisher<T>

    onErrorContinue(): PipePublisher<T>

    cast<U>(): PipePublisher<U>

    doFirst(action: () => void): PipePublisher<T>

    doOnNext(action: (value: T) => void): PipePublisher<T>

    doFinally(action: () => void): PipePublisher<T>

    publishOn(scheduler: Scheduler): PipePublisher<T>

    subscribeOn(scheduler: Scheduler): PipePublisher<T>

    timeout(duration: number): PipePublisher<T>
}