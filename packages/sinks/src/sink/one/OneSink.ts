import {Listener, Signal} from "@/listener/Listener";
import ClosableSink from "@/sink/ClosableSink";

/**
 * OneSink реализует Sink, который поддерживает только одного слушателя и эмитирует только одно значение или ошибку.
 * После того как одно значение или ошибка эмитированы, Sink завершает свою работу.
 */
export default class OneSink<T> extends ClosableSink<T> {
    private listener?: Listener<T> = null;  // Слушатель для данного Sink. Один слушатель на весь поток.

    /**
     * Эмитирует значение в поток и завершает его.
     * После этого никаких новых эмитов не будет разрешено.
     * @param value Значение, которое эмитируется.
     */
    public emitData(value: T): void {
        if (this.isNotClosed("Multiple emits are not supported by Sinks#one")) {
            this.listener?.(Signal.DATA, value)
            this.listener?.(Signal.CLOSE)
        }
    }

    /**
     * Эмитирует ошибку и завершает поток.
     * После этого никаких новых эмитов не будет разрешено.
     * @param error Ошибка, которая эмитируется.
     */
    public emitError(error: Error): void {
        if (this.isNotClosed("Multiple emits are not supported by Sinks#one")) {
            this.listener?.(Signal.ERROR, error)
            this.listener?.(Signal.CLOSE)
        }
    }

    /**
     * Завершает поток без эмита значения.
     * После этого никаких новых эмитов не будет разрешено.
     */
    public emitClose(): void {
        if (this.isNotClosed("Sinks#one is already closed!")) {
            this.closed = true;
            this.listener?.(Signal.CLOSE)
        }
    }

    /**
     * Добавляет слушателя в поток.
     * Поток поддерживает только одного слушателя, добавление второго не даст эффекта.
     * @param listener слушатель, который будет получать эмитированные значения или ошибки.
     */
    public addListener(listener: Listener<T>): void {
        if (this.listener) {
            throw new Error("Multiple listeners are not supported by Sinks#one")
        }
        this.listener = listener;
    }

    /**
     * Метод для удаления слушателя.
     * Для OneSink удаление слушателя не поддерживается, так как потоки закрываются после первого эмита.
     * @param listener слушатель, которого нужно удалить (но это не требуется для OneSink).
     */
    public removeListener(listener: Listener<T>): void {
        throw new Error("Removing listener are not supported by Sinks#one")
    }
}