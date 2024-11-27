import {Listener} from "@/listener/Listener";
import BufferedSink from "@/sink/backpressure/BufferedSink";
import Sink from "@/sink/Sink";

/**
 * Интерфейс Sink<T> описывает источник данных, поддерживающий операции по отправке значений,
 * ошибок, а также управление слушателями.
 */
export default abstract class CoreSink<T> implements Sink<T> {

    constructor() {
    }

    /**
     * Отправляет следующее значение слушателям.
     *
     * @param value Значение, которое будет отправлено слушателям.
     */
    abstract emitData(value: T): void;

    /**
     * Отправляет ошибку слушателям.
     *
     * @param error Ошибка, которая будет отправлена слушателям.
     */
    abstract emitError(error: Error): void;

    /**
     * Завершает поток данных, уведомляя слушателей.
     * После вызова этого метода ни одно новое значение или ошибка не будут отправлены.
     */
    abstract emitClose(): void;

    /**
     * Добавляет слушателя, который будет получать данные, ошибки или уведомления о завершении.
     *
     * @param listener слушатель, реализующий интерфейс Listener<T>.
     */
    abstract addListener(listener: Listener<T>): void;

    /**
     * Удаляет слушателя. Необязательно для всех реализаций, но предусмотрено интерфейсом.
     *
     * @param listener слушатель, который должен быть удалён.
     */
    abstract removeListener(listener: Listener<T>): void;

    public buffer(): BufferedSink<T> {
        return new BufferedSink(this)
    }
}