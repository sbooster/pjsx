import Subscriber from "@/pubsub/Subscriber";
import Subscription from "@/pubsub/Subscription";

export default interface Publisher<T> {
    subscribe(subscriber: ((data: T) => void) | Subscriber<T>): Subscription;
}