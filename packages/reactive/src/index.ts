import Mono from "@/publisher/mono/Mono";

Mono.just(1)
    // .doFinally(() => console.log("last"))
    // .map(value => value * 2)
    // .filter(value => value > 2)
    // .switchIfEmpty(Mono.defer(() => Mono.just(3).doOnNext(value => console.log(value))))
    // .flatMap(value => Mono.justOrEmpty(4))
    // .doFirst(() => console.log("first"))
    .flatMap<number>(value => {
        return Mono.error(new Error("er"))
    })
    .map(value => value + 5)
    // .onErrorReturn(Mono.just(0))
    // .doOnNext(value => console.log('here'))
    .subscribe({
        onNext(data: number) {
            console.log(data)
        },
        onError(error: Error) {
            console.error(error.message)
        },
        onComplete() {
            console.warn("complete")
        }
    })
