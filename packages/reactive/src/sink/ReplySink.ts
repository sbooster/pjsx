import ManySink from "@/sink/ManySink";
import Subscriber from "@/pubsub/Subscriber";

/**
 * ReplySink — абстрактный класс, наследующий ManySink.
 * Его особенность заключается в том, что он хранит историю эмитированных значений и ошибок,
 * и при добавлении нового подписчика повторяет эту историю для него.
 */
export abstract class ReplySink<T> extends ManySink<T> {
    protected history: Array<T | Error> = new Array<Error | T>(); // Хранит все эмитированные значения и ошибки.
    /**
     * Утилитарный метод для эмита значения или ошибки подписчику.
     * Если значение — ошибка, вызывает `onError`, иначе вызывает `onNext`.
     *
     * @param value Эмитируемое значение или ошибка.
     * @param subscriber Подписчик, которому отправляется значение или ошибка.
     */
    protected emitNextOrError(value: T | Error, subscriber: Subscriber<T>) {
        if (value instanceof Error) subscriber.onError(value)
        else subscriber.onNext(value)
    }

    /**
     * Добавляет подписчика и повторяет для него всю историю эмитированных значений и ошибок.
     *
     * @param subscriber Новый подписчик.
     */
    public addSubscriber(subscriber: Subscriber<T>) {
        if (this.isNotCompleted("Subscribe to a completed Sink#many is not supported.")) {
            this.subscribers.add(subscriber);
            this.history.forEach(value => this.emitNextOrError(value, subscriber));
        }
    }
}

/**
 * ReplyAllSink — реализует поведение ReplySink, где сохраняются и повторяются ВСЕ эмиты.
 */
export class ReplyAllSink<T> extends ReplySink<T> {
    /**
     * Эмитирует значение всем подписчикам и сохраняет его в истории.
     *
     * @param value Эмитируемое значение.
     */
    public emitNext(value: T) {
        if (this.isNotCompleted("Emit to a completed Sink#many is not supported.")) {
            this.history.push(value)
            this.subscribers.forEach(subscriber => subscriber.onNext(value))
        }
    }

    /**
     * Эмитирует ошибку всем подписчикам и сохраняет её в истории.
     *
     * @param error Эмитируемая ошибка.
     */
    public emitError(error: Error) {
        if (this.isNotCompleted("Emit to a completed Sink#many is not supported.")) {
            this.history.push(error)
            this.subscribers.forEach(subscriber => subscriber.onError(error))
        }
    }
}

/**
 * CountedReplaySink — абстрактный класс для реализации ReplaySink с ограничением по количеству сохраняемых значений.
 */
abstract class CountedReplaySink<T> extends ReplySink<T> {
    protected readonly count: number; // Ограничение на количество хранимых значений.

    /**
     * Конструктор принимает максимальное количество значений для сохранения в истории.
     *
     * @param count Максимальное количество хранимых значений.
     */
    public constructor(count: number) {
        super();
        this.count = count
    }

    /**
     * Абстрактный метод для добавления значения или ошибки в историю и эмита подписчикам.
     *
     * @param value Эмитируемое значение или ошибка.
     */
    protected abstract pushAndEmitNextOrError(value: T | Error): void;

    /**
     * Эмитирует значение, сохраняя его в истории с учетом ограничений.
     *
     * @param value Эмитируемое значение.
     */
    public emitNext(value: T) {
        this.pushAndEmitNextOrError(value)
    }

    /**
     * Эмитирует ошибку, сохраняя её в истории с учетом ограничений.
     *
     * @param error Эмитируемая ошибка.
     */
    public emitError(error: Error) {
        this.pushAndEmitNextOrError(error)
    }
}

/**
 * ReplayLatestSink — реализует ReplaySink, который сохраняет только последние N значений/ошибок.
 */
export class ReplayLatestSink<T> extends CountedReplaySink<T> {
    /**
     * Сохраняет значение или ошибку, удаляя самые старые записи, если превышен лимит.
     *
     * @param value Эмитируемое значение или ошибка.
     */
    protected pushAndEmitNextOrError(value: T | Error) {
        if (this.isNotCompleted("Emit to a completed Sink#many is not supported.")) {
            this.history.push(value)
            if (this.history.length > this.count) this.history.shift();
            this.subscribers.forEach(subscriber => this.emitNextOrError(value, subscriber))
        }
    }
}

/**
 * ReplayLimitSink — реализует ReplaySink, который сохраняет только первые N значений/ошибок.
 */
export class ReplayLimitSink<T> extends CountedReplaySink<T> {
    /**
     * Сохраняет значение или ошибку, если лимит еще не достигнут.
     *
     * @param value Эмитируемое значение или ошибка.
     */
    protected pushAndEmitNextOrError(value: T | Error) {
        if (this.isNotCompleted("Emit to a completed Sink#many is not supported.")) {
            if (this.history.length < this.count) this.history.push(value)
            this.subscribers.forEach(subscriber => this.emitNextOrError(value, subscriber))
        }
    }
}