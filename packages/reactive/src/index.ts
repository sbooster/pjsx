import type Publisher from "@/publisher/Publisher";
import type Subscription from "@/subscription/Subscription";
import type Subscriber from "@/subscriber/Subscriber";
import type PipePublisher from "@/publisher/PipePublisher";
import Mono from "@/publisher/mono";
import Flux from "@/publisher/flux";

export {
    Mono,
    Flux,
    Publisher,
    PipePublisher,
    Subscriber,
    Subscription
}

Mono.just(1)
    .doFinally(() => console.log("finally"))
    .map(value => value * 2)
    .flatMap(value => Mono.defer(() => Mono.just(value * 2)))
    .filter(value => value == 5)
    .switchIfEmpty(Mono.just(5))
    .doOnNext(value => console.log('next: ', value * 2))
    .doFirst(() => console.log('first'))
    .zipWith(Mono.just(5), (value1, value2) => value1/value2)
    .doOnNext(value => {
        throw new Error('asd')
    })
    .onErrorReturn(Mono.just(3))
    .hasElement()
    .subscribe({
        onNext(data: null) {
            console.log('result: ', data)
        },
        onError(error: Error) {
            console.error(error.message)
        },
        onComplete() {
            console.log('complete')
        }
    })