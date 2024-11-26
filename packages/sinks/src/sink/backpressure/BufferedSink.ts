import {Listener, Signal} from "@/listener/Listener";
import {Sink} from "@/index";

/**
 * BufferingSink — враппер для Sink, который буферизирует данные.
 * Данные выдаются исключительно по запросу через метод `request(count)`.
 */
export default class BufferedSink<T> implements Sink<T> {
    private readonly backpressure: Array<{ signal: Signal, data: T | Error }> = [];
    private requested: number = 0; // Счетчик запрошенных данных.
    protected listeners: Set<Listener<T>> = new Set<Listener<T>>();

    constructor(sink: Sink<T>) {
        sink.addListener((signal, data) => {
            this.backpressure.push({signal, data})
            this.flushBuffer()
        })
    }

    /**
     * Метод для запроса данных из буфера.
     * Если запрашиваемое количество превышает доступное, данные будут доставлены по мере поступления.
     *
     * @param count Количество элементов, которые необходимо получить.
     */
    public request(count: number): void {
        this.requested += count;
        this.flushBuffer();
    }

    /**
     * Эмитирует данные из буфера, если есть запрошенные данные.
     */
    private flushBuffer(): void {
        while (this.requested > 0 && this.backpressure.length > 0) {
            const value = this.backpressure.shift()!;
            switch (value.signal) {
                case Signal.DATA: {
                    this.emitData(value.data as T)
                    break
                }
                case Signal.ERROR: {
                    this.emitError(value.data as Error)
                    break
                }
                case Signal.CLOSE: {
                    this.emitClose()
                    break
                }
            }
            this.requested--;
        }
    }

    /**
     * Эмитирует значение. Данные помещаются в буфер.
     *
     * @param value Значение, которое будет добавлено в буфер.
     */
    public emitData(value: T): void {
        this.listeners.forEach(listener => listener(Signal.DATA, value))
    }

    /**
     * Эмитирует ошибку слушателям.
     *
     * @param error Ошибка, которая будет передана.
     */
    public emitError(error: Error): void {
        this.listeners.forEach(listener => listener(Signal.ERROR, error))
    }

    /**
     * Завершает поток.
     */
    public emitClose(): void {
        this.listeners.forEach(listener => listener(Signal.CLOSE))
    }

    /**
     * Добавляет слушателя. Передает все данные в буфер через внутренний слушатель.
     *
     * @param listener Слушатель для получения данных.
     */
    public addListener(listener: Listener<T>): void {
        this.listeners.add(listener);
    }

    /**
     * Удаляет слушателя.
     *
     * @param listener Слушатель, который необходимо удалить.
     */
    public removeListener(listener: Listener<T>): void {
        this.listeners.delete(listener);
    }

    public buffer(): BufferedSink<T> {
        return this;
    }
}
