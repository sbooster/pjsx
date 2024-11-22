import Subscription from "@/pubsub/Subscription";

export default interface Subscriber<T> {
    // onSubscribe(subscription: Subscription): void;
    onNext(data: T): void;
    onError(error: Error): void;
    onComplete(): void;
}