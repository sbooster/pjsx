import Subscriber from "@/pubsub/Subscriber";
import CompletableSink from "@/sink/CompletableSink";

/**
 * OneSink реализует Sink, который поддерживает только одного подписчика и эмитирует только одно значение или ошибку.
 * После того как одно значение или ошибка эмитированы, Sink завершает свою работу.
 */
export default class OneSink<T> extends CompletableSink<T> {
    private subscriber?: Subscriber<T> = null;  // Подписчик для данного Sink. Один подписчик на весь поток.

    /**
     * Эмитирует значение в поток и завершает его.
     * После этого никаких новых эмитов не будет разрешено.
     * @param value Значение, которое эмитируется.
     */
    public emitNext(value: T): void {
        if (this.isNotCompleted("Multiple emits are not supported by Sinks#one")) {
            this.subscriber?.onNext(value)
            this.subscriber?.onComplete();
        }
    }

    /**
     * Эмитирует ошибку и завершает поток.
     * После этого никаких новых эмитов не будет разрешено.
     * @param error Ошибка, которая эмитируется.
     */
    public emitError(error: Error): void {
        if (this.isNotCompleted("Multiple emits are not supported by Sinks#one")) {
            this.subscriber?.onError(error)
            this.subscriber?.onComplete();
        }
    }

    /**
     * Завершает поток без эмита значения.
     * После этого никаких новых эмитов не будет разрешено.
     */
    public emitComplete(): void {
        if (this.isNotCompleted("Sinks#one is already completed!")) {
            this.completed = true;
            this.subscriber?.onComplete();
        }
    }

    /**
     * Добавляет подписчика в поток.
     * Поток поддерживает только одного подписчика, добавление второго не даст эффекта.
     * @param subscriber Подписчик, который будет получать эмитированные значения или ошибки.
     */
    public addSubscriber(subscriber: Subscriber<T>): void {
        if (this.subscriber) {
            throw new Error("Multiple subscriptions are not supported by Sinks#one")
        }
        this.subscriber = subscriber;
    }

    /**
     * Метод для удаления подписчика.
     * Для OneSink удаление подписчика не поддерживается, так как потоки закрываются после первого эмита.
     * @param subscriber Подписчик, которого нужно удалить (но это не требуется для OneSink).
     */
    public removeSubscriber(subscriber: Subscriber<T>): void {
        throw new Error("Unsubscribe are not supported by Sinks#one")
    }
}