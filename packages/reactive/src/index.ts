import * as console from "node:console";

export type {default as Subscription} from '@/subscription/Subscription'
export type {default as Subscriber} from '@/subscriber/Subscriber'
export type {default as Publisher} from '@/publisher/Publisher'
export {default as CorePublisher} from '@/publisher/CorePublisher'
export {default as Mono} from '@/publisher/mono/Mono'
export {default as Flux} from '@/publisher/flux/Flux'

import Flux from '@/publisher/flux/Flux'
import Schedulers from "schedulers";
import Sinks from "sinks";
import Mono from "@/publisher/mono/Mono";

// Schedulers.delay(1000).schedule(() => console.log("delay")) // вызвать с задержкой
// Schedulers.macro().schedule(() => console.log("macro")) // вызвать асинхронно
// Schedulers.async().schedule(() => console.log("async")) // вызвать асинхронно, как можно скорее
// Schedulers.immediate().schedule(() => console.log("immediate")) // вызвать прямо сейчас в том потоке, в котором находится.
// console output:
//   immediate
//   async
//   macro
//   delay

let subscription = Flux.defer(() => Flux.fromIterable([1, 2, 3, 4, 5]))
    .map(value => value * 2)
    .flatMap(value => Flux.fromIterable([value / 2, value]))
    .filterWhen(value => Flux.fromIterable([true]))
    .filter(value => value % 5 == 0)
    .mapNotNull(value => value == 5 ? null : value)
    .flatMap(value => {
        let sink = Sinks.many().replay().all<number>();
        for (let i = 0; i < value; ++i) {
            sink.emitData(i)
        }
        return Flux.from(sink)
    })
    .flatMap(value => Mono.just(value * 2).map(value => value / 2).filter(value => value % 2 == 0))
    .subscribe({
        onNext(data: number) {
            console.log("next: ", data)
        },
        onError(error: Error) {
            console.log("error: ", error.message)
        },
        onComplete(): void {
            console.log("complete")
        }
    });
subscription.request(5)