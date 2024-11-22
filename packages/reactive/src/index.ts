import Mono from "@/mono/Mono";
import * as console from "node:console";


Mono.just(1)
let subscription = Mono.defer(() => {
    console.log('Declaring defer')
    return Mono.just(1)
})
    .doOnNext(value => console.log('Init value: ', value))
    .map(value => value * 2)
    .doFinally(() => console.log('Last action'))
    .doOnNext(value => console.log('Mapped value: ', value))
    .flatMap(value => Mono.just(value * 2))
    .doOnNext(value => console.log('FlatMapped value: ', value))
    .filter(value => value % 2 == 0)
    .doOnNext(value => console.log('Filtered value: ', value))
    .mapNotNull(value => null)
    .doFirst(() => console.log('First action'))
    .doOnNext(value => console.log('Nullable value: ', value))
    .switchIfEmpty(Mono.just(1))
    .doOnNext(value => console.log("Switched value: ", value))
    .zipWhen(value => Mono.just(value * 2), (value, other) => `${value}, ${other}`)
    .zipWith(Mono.fromPromise(new Promise(resolve => setTimeout(() => resolve(10), 1000))), (value1, value2) => `${value1} , ${value2}`)
    .subscribe({
        onNext(data: string) {
            console.log('Result value', data)
        },
        onError(error: Error) {
            console.log('Resolved error', error)
        },
        onComplete() {
            console.log('Completed')
        }
    });
subscription.request(1)

export function reactive() {
    return 'Hello from reactive 2';
}
