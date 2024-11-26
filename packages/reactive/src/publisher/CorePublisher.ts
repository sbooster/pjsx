import Publisher from "@/publisher/Publisher";
import Subscriber from "../subscriber/Subscriber";
import Subscription from "../subscription/Subscription";
import {Signal, Sink} from "sinks";
import {Listener} from "sinks/dist/listener/Listener";

/**
 * Абстрактный класс для реализации издателя (Publisher), который обрабатывает подписчиков
 * и потоки данных. Класс предоставляет основные механизмы для подписки на поток данных,
 * обработки данных, ошибок и завершения потока.
 */
export default abstract class CorePublisher<T> implements Publisher<T> {
    // Ссылка на объект Sink, который управляет событиями данных
    protected sink: Sink<T>;
    // Функция, производящая данные (например, загружает данные, генерирует события)
    protected readonly producer: (sink: Sink<T>, count: number) => void;

    /**
     * Конструктор для создания экземпляра издателя.
     *
     * @param producer - Функция, которая будет генерировать данные или события и передавать их в Sink.
     */
    protected constructor(producer: (sink: Sink<T>, count: number) => void) {
        this.sink = this.createSink();
        this.producer = producer;
    }

    /**
     * Абстрактный метод для создания Sink. Должен быть реализован в подклассе.
     *
     * @returns новый объект Sink для обработки данных.
     */
    protected abstract createSink(): Sink<T>;

    /**
     * Подписка на поток данных.
     * Позволяет подписчику получать данные, ошибки и завершение потока.
     *
     * @param subscriber - Функция или объект подписчика, который будет получать события.
     *  - Если передана функция, она будет обрабатывать только данные.
     *  - Если передан объект, то он должен реализовывать интерфейс `Subscriber<T>`.
     *
     * @returns Объект подписки с методами для запроса данных и отмены подписки.
     */
    public subscribe(subscriber?: ((data: T) => void) | Subscriber<T>): Subscription | void {
        const sub = CorePublisher.adaptSubscriber(subscriber || (() => {
        }));
        this.sink.addListener(sub)
        return {
            request: (count: number) => {
                this.producer(this.sink, count)
            },
            unsubscribe: () => {
                this.sink.removeListener(sub)
            }
        }
    }

    /**
     * Адаптирует подписчика, превращая его в Listener для работы с Sink.
     * Если подписчик является функцией, он будет адаптирован в объект с методами onNext, onError и onComplete.
     *
     * @param subscriber - Функция или объект подписчика.
     *
     * @returns Listener, который может быть передан в Sink для обработки событий.
     */
    protected static adaptSubscriber<T>(subscriber: ((data: T) => void) | Subscriber<T>): Listener<T> {
        subscriber = CorePublisher.normalizeSubscriber(subscriber)
        return (signal, data) => {
            switch (signal) {
                case Signal.DATA: {
                    subscriber.onNext(data as T)
                    break;
                }
                case Signal.ERROR: {
                    subscriber.onError(data as Error)
                    break;
                }
                case Signal.CLOSE: {
                    subscriber.onComplete()
                    break;
                }
            }
        }
    }

    protected static normalizeSubscriber<T>(subscriber: ((data: T) => void) | Subscriber<T>): Subscriber<T> {
        if (typeof subscriber == "function") {
            return {
                onNext: subscriber,
                onComplete() {
                    // TODO default complete handler
                },
                onError(error: Error) {
                    // TODO default error handler
                }
            } as Subscriber<T>
        }
        return subscriber
    }
}