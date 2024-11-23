import ManySink from "@/sink/many/ManySink";
import {Listener} from "@/listener/Listener";

/**
 * UnicastSink — реализация ManySink, которая поддерживает только одного слушателя.
 * Если попытаться добавить больше одного слушателей, то это не даст эффекта
 */
export default class UnicastSink<T> extends ManySink<T> {
    /**
     * Добавляет слушателя, если его ещё нет.
     *
     * @param listener Новый слушатель.
     */
    public addListener(listener: Listener<T>): void {
        if (this.listeners.size == 0) {
            super.addListener(listener)
        } else {
            throw new Error("Multiple listeners are not supported by Sinks#many#unicast")
        }
    }

    /**
     * Метод удаления слушателя не поддерживается для UnicastSink.
     *
     * @param listener слушатель, который запрашивает удаление.
     */
    public removeListener(listener: Listener<T>): void {
        throw new Error("Removing listener are not supported by Sinks#many#unicast")
    }
}