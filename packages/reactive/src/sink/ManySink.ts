import Subscriber from "@/pubsub/Subscriber";
import CompletableSink from "@/sink/CompletableSink";

/**
 * ManySink — это класс, который поддерживает несколько подписчиков.
 * Этот Sink позволяет эмитировать значения или ошибки нескольким подписчикам.
 */
export default class ManySink<T> extends CompletableSink<T> {
    // Множество подписчиков, которые подписаны на этот Sink.
    // Используется Set, чтобы автоматически исключать дублированных подписчиков.
    protected subscribers: Set<Subscriber<T>> = new Set<Subscriber<T>>();

    /**
     * Эмитирует следующее значение для всех подписчиков.
     * После эмита все подписчики получают это значение.
     * Если Sink завершен, дальнейшие эмиты не будут выполняться.
     *
     * @param value Значение, которое будет отправлено всем подписчикам.
     */
    public emitNext(value: T): void {
        if (this.isNotCompleted("Emit to a completed Sink#many is not supported.")) {
            this.subscribers.forEach(subscriber => subscriber.onNext(value))
        }
    }

    /**
     * Эмитирует ошибку для всех подписчиков.
     * После эмита все подписчики получат ошибку.
     * Если Sink завершен, дальнейшие эмиты не будут выполняться.
     *
     * @param error Ошибка, которую необходимо передать всем подписчикам.
     */
    public emitError(error: Error): void {
        if (this.isNotCompleted("Emit to a completed Sink#many is not supported.")) {
            this.subscribers.forEach(subscriber => subscriber.onError(error))
        }
    }

    /**
     * Завершаем поток и уведомляем всех подписчиков о завершении.
     * После завершения не будет эмитироваться ни одно новое значение.
     */
    public emitComplete(): void {
        if (this.isNotCompleted("Sinks#many is already completed!")) {
            this.completed = true;
            this.subscribers.forEach(subscriber => subscriber.onComplete())
        }
    }

    /**
     * Добавляет подписчика в Sink.
     * Если поток уже завершен, подписка не будет добавлена.
     * Новый подписчик получит все будущие эмиты.
     *
     * @param subscriber Подписчик, который будет добавлен в Sink.
     */
    public addSubscriber(subscriber: Subscriber<T>): void {
        if (this.isNotCompleted("Subscribe to a completed Sink#many is not supported.")) {
            this.subscribers.add(subscriber);
        }
    }

    /**
     * Удаляет подписчика из Sink.
     * Если подписчик был удален, он больше не будет получать эмиты.
     *
     * @param subscriber Подписчик, который будет удален.
     */
    public removeSubscriber(subscriber: Subscriber<T>): void {
        this.subscribers.delete(subscriber);
    }
}