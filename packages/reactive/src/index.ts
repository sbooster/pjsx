import Mono from "@/mono/Mono";
import Subscription from "@/pubsub/Subscription";
// Mono.just(1)
Mono.defer(() => Mono.just(1))
    .map(value => {
        console.log(value)
        return value * 2
    })
    .doOnNext(value => console.log('nnn', value))
    .doFirst(() => console.log('second'))
    .map(value => {
        console.log(value)
        return value * 2
    })
    .doFinally(() => console.log('end2'))
    .map(value => {
        console.log(value)
        return value * 2
    })
    .doFirst(() => console.log('first'))
    .doFinally(() => console.log('end1'))
    .map(value => {
        console.log('qqq')
        return value
    })
    .filter(value => value == 16)
    .switchIfEmpty(Mono.just(1))
    .subscribe({
        onSubscribe(subscription: Subscription) {
            console.log('request')
            subscription.request(1)
        },
        onNext(data: number) {
            console.log('next', data)
        },
        onError(error: Error) {
            console.log('error', error)
        },
        onComplete() {
            console.log('complete')
        }
    })

export function reactive() {
    return 'Hello from reactive 2';
}
