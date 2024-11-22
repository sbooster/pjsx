import ManySink from "@/sink/ManySink";
import Subscriber from "@/pubsub/Subscriber";

/**
 * UnicastSink — реализация ManySink, которая поддерживает только одного подписчика.
 * Если попытаться добавить больше одного подписчика, то это не даст эффекта
 */
export default class UnicastSink<T> extends ManySink<T> {
    /**
     * Добавляет подписчика, если его ещё нет.
     *
     * @param subscriber Новый подписчик.
     */
    public addSubscriber(subscriber: Subscriber<T>): void {
        if (this.subscribers.size == 0) {
            super.addSubscriber(subscriber)
        } else {
            throw new Error("Multiple subscriptions are not supported by Sinks#many#unicast")
        }
    }

    /**
     * Метод удаления подписчика не поддерживается для UnicastSink.
     *
     * @param subscriber Подписчик, который запрашивает удаление.
     */
    public removeSubscriber(subscriber: Subscriber<T>): void {
        throw new Error("Unsubscribe are not supported by Sinks#many#unicast")
    }
}