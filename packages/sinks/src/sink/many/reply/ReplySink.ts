import ManySink from "@/sink/many/ManySink";
import {Listener, Signal} from "@/listener/Listener";

/**
 * ReplySink — абстрактный класс, наследующий ManySink.
 * Его особенность заключается в том, что он хранит историю эмитированных значений и ошибок,
 * и при добавлении нового слушателя повторяет эту историю для него.
 */
export abstract class ReplySink<T> extends ManySink<T> {
    protected history: Array<T | Error> = new Array<Error | T>(); // Хранит все эмитированные значения и ошибки.
    /**
     * Утилитарный метод для эмита значения или ошибки слушателю.
     * Если значение — ошибка, вызывает `onError`, иначе вызывает `onNext`.
     *
     * @param value Эмитируемое значение или ошибка.
     * @param listener слушатель, которому отправляется значение или ошибка.
     */
    protected emitNextOrError(value: T | Error, listener: Listener<T>) {
        listener(value instanceof Error ? Signal.ERROR : Signal.DATA, value)
    }

    /**
     * Добавляет слушателя и повторяет для него всю историю эмитированных значений и ошибок.
     *
     * @param listener Новый слушатель.
     */
    public addListener(listener: Listener<T>) {
        if (this.isNotClosed("Listen a closed Sink#many is not supported.")) {
            this.listeners.add(listener);
            this.history.forEach(value => this.emitNextOrError(value, listener));
        }
    }
}

/**
 * ReplyAllSink — реализует поведение ReplySink, где сохраняются и повторяются ВСЕ эмиты.
 */
export class ReplyAllSink<T> extends ReplySink<T> {
    /**
     * Эмитирует значение всем слушателям и сохраняет его в истории.
     *
     * @param value Эмитируемое значение.
     */
    public emitData(value: T) {
        if (this.isNotClosed("Emit to a closed Sink#many is not supported.")) {
            this.history.push(value)
            this.listeners.forEach(listener => listener(Signal.DATA, value))
        }
    }

    /**
     * Эмитирует ошибку всем слушателям и сохраняет её в истории.
     *
     * @param error Эмитируемая ошибка.
     */
    public emitError(error: Error) {
        if (this.isNotClosed("Emit to a closed Sink#many is not supported.")) {
            this.history.push(error)
            this.listeners.forEach(listener => listener(Signal.ERROR, error))
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
     * Абстрактный метод для добавления значения или ошибки в историю и эмита слушателям.
     *
     * @param value Эмитируемое значение или ошибка.
     */
    protected abstract pushAndEmitNextOrError(value: T | Error): void;

    /**
     * Эмитирует значение, сохраняя его в истории с учетом ограничений.
     *
     * @param value Эмитируемое значение.
     */
    public emitData(value: T) {
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
        if (this.isNotClosed("Emit to a closed Sink#many is not supported.")) {
            this.history.push(value)
            if (this.history.length > this.count) this.history.shift();
            this.listeners.forEach(listener => this.emitNextOrError(value, listener))
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
        if (this.isNotClosed("Emit to a closed Sink#many is not supported.")) {
            if (this.history.length < this.count) this.history.push(value)
            this.listeners.forEach(listener => this.emitNextOrError(value, listener))
        }
    }
}