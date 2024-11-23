export type {default as Subscription} from '@/subscription/Subscription'
export type {default as Subscriber} from '@/subscriber/Subscriber'
export type {default as Publisher} from '@/publisher/Publisher'
export {default as CorePublisher} from '@/publisher/CorePublisher'
export {default as Mono} from '@/publisher/mono/Mono'
export {default as Flux} from '@/publisher/flux/Flux'

import Schedulers from "schedulers";

Schedulers.delay(1000).schedule(() => console.log("delay")) // вызвать с задержкой
Schedulers.macro().schedule(() => console.log("macro")) // вызвать асинхронно
Schedulers.async().schedule(() => console.log("async")) // вызвать асинхронно, как можно скорее
Schedulers.immediate().schedule(() => console.log("immediate")) // вызвать прямо сейчас в том потоке, в котором находится.
// console output:
//   immediate
//   async
//   macro
//   delay

