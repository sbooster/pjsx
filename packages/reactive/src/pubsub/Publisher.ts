import Subscriber from "@/pubsub/Subscriber";

export default interface Publisher<T> {
    subscribe(subscriber: Subscriber<T>): void;
}