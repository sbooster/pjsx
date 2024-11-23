import {Listener, Signal} from "@/listener/Listener";
import ClosableSink from "@/sink/ClosableSink";

/**
 * ManySink — это класс, который поддерживает несколько слушателей.
 * Этот Sink позволяет эмитировать значения или ошибки нескольким слушателям.
 */
export default class ManySink<T> extends ClosableSink<T> {
    // Множество слушателей, которые слушают этот Sink.
    // Используется Set, чтобы автоматически исключать дублированных слушателей.
    protected listeners: Set<Listener<T>> = new Set<Listener<T>>();

    /**
     * Эмитирует следующее значение для всех слушателей.
     * После эмита все слушатели получают это значение.
     * Если Sink завершен, дальнейшие эмиты не будут выполняться.
     *
     * @param value Значение, которое будет отправлено всем слушателям.
     */
    public emitData(value: T): void {
        if (this.isNotClosed("Emit to a closed Sink#many is not supported.")) {
            this.listeners.forEach(listener => listener(Signal.DATA, value))
        }
    }

    /**
     * Эмитирует ошибку для всех слушателей.
     * После эмита все слушатели получат ошибку.
     * Если Sink завершен, дальнейшие эмиты не будут выполняться.
     *
     * @param error Ошибка, которую необходимо передать всем слушателям.
     */
    public emitError(error: Error): void {
        if (this.isNotClosed("Emit to a closed Sink#many is not supported.")) {
            this.listeners.forEach(listener => listener(Signal.ERROR, error))
        }
    }

    /**
     * Завершаем поток и уведомляем всех слушателей о завершении.
     * После завершения не будет эмитироваться ни одно новое значение.
     */
    public emitClose(): void {
        if (this.isNotClosed("Sinks#many is already closed!")) {
            this.closed = true;
            this.listeners.forEach(listener => listener(Signal.CLOSE))
        }
    }

    /**
     * Добавляет слушателя в Sink.
     * Если поток уже завершен, слушатель не будет добавлен.
     * Новый слушатель получит все будущие эмиты.
     *
     * @param listener слушатель, который будет добавлен в Sink.
     */
    public addListener(listener: Listener<T>): void {
        if (this.isNotClosed("Listen a closed Sink#many is not supported.")) {
            this.listeners.add(listener);
        }
    }

    /**
     * Удаляет слушателя из Sink.
     * Если слушатель был удален, он больше не будет получать эмиты.
     *
     * @param listener слушатель, который будет удален.
     */
    public removeListener(listener: Listener<T>): void {
        this.listeners.delete(listener);
    }
}