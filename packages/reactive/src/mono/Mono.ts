import Sink from "@/sink/Sink";
import Subscriber from "@/pubsub/Subscriber";
import Sinks from "@/sink/Sinks";

/**
 * Класс Mono<T> представляет асинхронный поток данных, содержащий одно значение,
 * ошибку или ничего (пустой поток). Поддерживает ленивую и немедленную обработку.
 */
export default class Mono<T> {
    private readonly sink: Sink<T>; // Управляет эмитами данных (onNext, onError, onComplete)
    private readonly producer: ((sink: Sink<T>) => void) | null; // Производитель данных (ленивый или немедленный)

    /**
     * Конструктор Mono. Создает новый Mono с указанным Sink и производителем данных.
     * @param sink - Эмиттер данных.
     * @param producer - Функция, которая будет запущена для создания данных.
     */
    public constructor(sink: Sink<T>, producer: ((sink: Sink<T>) => void)) {
        this.sink = sink;
        this.producer = producer;
    }

    /**
     * Создает Mono, который эмитирует указанное значение и завершает поток.
     * @param value - Значение для эмита.
     * @returns Новый экземпляр Mono.
     */
    public static just<T>(value: T): Mono<T> {
        return new Mono<T>(Sinks.one(), (sink) => sink.emitNext(value));
    }

    /**
     * Создает Mono, который эмитирует указанную ошибку.
     * @param error - Ошибка для эмита.
     * @returns Новый экземпляр Mono.
     */
    public static error<T>(error: Error): Mono<T> {
        return new Mono<T>(Sinks.one(), (sink) => sink.emitError(error));
    }

    /**
     * Создает пустой Mono, который сразу завершает поток.
     * @returns Новый экземпляр Mono.
     */
    public static empty<T>(): Mono<T> {
        return new Mono<T>(Sinks.one(), (sink) => sink.emitComplete());
    }

    /**
     * Создает ленивый Mono, производящий данные при подписке.
     * @param producer - Функция, возвращающая Mono.
     * @returns Новый экземпляр Mono.
     */
    public static defer<T>(producer: () => Mono<T>): Mono<T> {
        return new Mono<T>(Sinks.one(), (sink) => {
            try {
                let mono = producer();
                let emitted = false;
                mono.subscribe({
                    onSubscribe: (subscription) => subscription.request(1),
                    onNext: (value) => {
                        emitted = true;
                        sink.emitNext(value)
                    },
                    onError: (error) => {
                        emitted = true;
                        sink.emitError(error)
                    },
                    onComplete: () => {
                        if (!emitted) /*mono.*/sink.emitComplete()
                    },
                });
            } catch (exception) {
                sink.emitError(exception)
            }
        });
    }

    /**
     * Преобразует значение в потоке с помощью указанной функции.
     * @param mapper - Функция для преобразования значения.
     * @returns Новый экземпляр Mono с преобразованным значением.
     */
    public map<U>(mapper: (value: T) => U): Mono<U> {
        return new Mono<U>(Sinks.one(), (sink) => {
            let emitted = false;
            this.subscribe({
                onSubscribe: (subscription) => subscription.request(1),
                onNext: (value) => {
                    emitted = true;
                    try {
                        let result = mapper(value);
                        sink.emitNext(result)
                    } catch (e) {
                        sink.emitError(e)
                    }
                },
                onError: (error) => {
                    emitted = true;
                    sink.emitError(error)
                },
                onComplete: () => {
                    if (!emitted) sink.emitComplete()
                },
            });
        });
    }

    /**
     * Оператор mapNotNull: преобразует значения и фильтрует null.
     */
    public mapNotNull<U>(mapper: (value: T) => U | null): Mono<U> {
        return new Mono<U>(Sinks.one(), (sink) => {
            let emitted = false;
            this.subscribe({
                onSubscribe: (subscription) => subscription.request(1),
                onNext: (value) => {
                    emitted = true;
                    try {
                        const mappedValue = mapper(value);
                        if (mappedValue !== null) sink.emitNext(mappedValue);
                        else sink.emitComplete();
                    } catch (e) {
                        sink.emitError(e)
                    }
                },
                onError: (error) => {
                    emitted = true;
                    sink.emitError(error)
                },
                onComplete: () => {
                    if (!emitted) sink.emitComplete()
                },
            });
        });
    }

    /**
     * Оператор flatMap: преобразует значение в новый Mono.
     */
    public flatMap<U>(mapper: (value: T) => Mono<U>): Mono<U> {
        return new Mono<U>(Sinks.one(), (sink) => {
            let emitted = false;
            this.subscribe({
                onSubscribe: (subscription) => subscription.request(1),
                onNext: (value) => {
                    emitted = true;
                    try {
                        let mono = mapper(value);
                        let emitted2 = false;
                        mono.subscribe({
                            onSubscribe: (innerSubscription) => innerSubscription.request(1),
                            onNext: (innerValue) => {
                                emitted2 = true;
                                sink.emitNext(innerValue)
                            },
                            onError: (error) => {
                                emitted2 = true;
                                sink.emitError(error)
                            },
                            onComplete: () => {
                                if (!emitted2) mono.sink.emitComplete()
                            },
                        });
                    } catch (e) {
                        sink.emitError(e)
                    }
                },
                onError: (error) => {
                    emitted = true;
                    sink.emitError(error)
                },
                onComplete: () => {
                    if (!emitted) sink.emitComplete()
                },
            });
        });
    }

    /**
     * Оператор filter: пропускает элементы, которые удовлетворяют предикату.
     */
    public filter(predicate: (value: T) => boolean): Mono<T> {
        return new Mono<T>(Sinks.one(), (sink) => {
            let emitted = false
            this.subscribe({
                onSubscribe: (subscription) => subscription.request(1),
                onNext: (value) => {
                    emitted = true
                    try {
                        if (predicate(value)) sink.emitNext(value);
                        else sink.emitComplete(); // Завершаем, если предикат не выполняется
                    } catch (exception) {
                        sink.emitError(exception)
                    }
                },
                onError: (error) => {
                    emitted = true;
                    sink.emitError(error)
                },
                onComplete: () => {
                    if (!emitted) sink.emitComplete()
                },
            });
        });
    }

    /**
     * Оператор zipWith: комбинирует текущее значение с другим Mono.
     * Создает Mono, который эмитирует результат комбинации значений из текущего и другого Mono.
     */
    public zipWitn<T2, R>(
        other: Mono<T2>, // Функция, которая для каждого значения из Mono возвращает новый Mono
        combiner: (value1: T, value2: T2) => R // Функция комбинирования значений из двух Mono
    ): Mono<R> {
        return this.zipWhen(value => other, combiner);
    }

    /**
     * Оператор zipWhen: комбинирует текущее значение с потоком, созданным функцией, которая принимает текущее значение.
     * Для каждого значения из текущего Mono создается новый поток, и результат комбинируется.
     */
    public zipWhen<T2, R>(
        fn: (value: T) => Mono<T2>, // Функция, которая для каждого значения из Mono возвращает новый Mono
        combiner: (value1: T, value2: T2) => R // Функция комбинирования значений из двух Mono
    ): Mono<R> {
        return new Mono<R>(Sinks.one(), (sink) => {
            let emitted = false;
            this.subscribe({
                onSubscribe: (subscription) => subscription.request(1),
                onNext: (data) => {
                    emitted = true;
                    try {
                        let emitted2 = false;
                        fn(data).subscribe({
                            onSubscribe: (subscription) => subscription.request(1),
                            onNext: (other) => {
                                emitted2 = true;
                                try {
                                    sink.emitNext(combiner(data, other)); // Когда оба значения получены
                                } catch (e) {
                                    sink.emitError(e)
                                }
                            },
                            onError: (error) => {
                                emitted2 = true;
                                sink.emitError(error)
                            },
                            onComplete: () => {
                                if (!emitted2) sink.emitComplete();
                            }
                        });
                    } catch (e) {
                        sink.emitError(e)
                        return
                    }
                },
                onError: (error) => {
                    emitted = true
                    sink.emitError(error)
                },
                onComplete: () => {
                    // if (!emitted) sink.emitComplete();
                }
            });
        });
    }

    /**
     * Оператор cast: приводит значение к указанному типу.
     */
    public cast<U>(): Mono<U> {
        return this.map(value => value as unknown as U);
    }

    /**
     * Оператор doFirst: выполняет действие до запуска потока.
     */
    public doFirst(action: () => void): Mono<T> {
        return new Mono<T>(this.sink, (sink) => {
            try {
                action();
                this.producer?.call(this, sink);
            } catch (exception) {
                sink.emitError(exception)
            }
        });
    }

    /**
     * Оператор doFinally: выполняет действие после завершения потока.
     */
    public doFinally(action: () => void): Mono<T> {
        return new Mono<T>(Sinks.one(), (sink) => {
            let emitted = false;
            this.subscribe({
                onSubscribe: (subscription) => subscription.request(1),
                onNext: (value) => {
                    emitted = true;
                    sink.emitNext(value);
                },
                onError: (error) => {
                    emitted = true;
                    sink.emitError(error);
                },
                onComplete: () => {
                    if (!emitted) {
                        sink.emitComplete();
                    }
                    action();
                },
            });
        });
    }

    /**
     * Оператор doOnNext: выполняет действие при эмите значения.
     */
    public doOnNext(action: (value: T) => void): Mono<T> {
        return new Mono<T>(Sinks.one(), (sink) => {
            let emitted = false;
            this.subscribe({
                onSubscribe: (subscription) => subscription.request(1),
                onNext: (value) => {
                    emitted = true;
                    try {
                        action(value);
                        sink.emitNext(value);
                    } catch (exception) {
                        sink.emitError(exception)
                    }
                },
                onError: (error) => {
                    emitted = true;
                    sink.emitError(error)
                },
                onComplete: () => {
                    if (!emitted) sink.emitComplete()
                },
            });
        });
    }

    /**
     * Оператор switchIfEmpty: переключается на другой Mono, если поток пуст.
     */
    public switchIfEmpty(alternate: Mono<T>): Mono<T> {
        return new Mono<T>(Sinks.one(), (sink) => {
            let emitted = false;
            this.subscribe({
                onSubscribe: (subscription) => subscription.request(1),
                onNext: (value) => {
                    emitted = true;
                    sink.emitNext(value);
                },
                onError: (error) => {
                    emitted = true;
                    sink.emitError(error)
                },
                onComplete: () => {
                    if (!emitted) {
                        alternate.subscribe({
                            onSubscribe: (subscription) => subscription.request(1),
                            onNext: (value) => sink.emitNext(value),
                            onError: (error) => sink.emitError(error),
                            onComplete: () => {
                                // sink.emitComplete()
                            },
                        });
                    }
                },
            });
        });
    }

    /**
     * Оператор onErrorReturn: возвращает указанное значение в случае ошибки.
     * Обрабатывает ошибку локально, не передавая её родительскому потоку.
     */
    public onErrorReturn(mono: Mono<T>): Mono<T> {
        return new Mono<T>(Sinks.one(), (sink) => {
            let emitted = false;
            this.subscribe({
                onSubscribe: (subscription) => subscription.request(1),
                onNext: (value) => {
                    emitted = true;
                    sink.emitNext(value);
                },
                onError: (error) => {
                    emitted = true;
                    let emitted2 = false;
                    mono.subscribe({
                        onSubscribe: (subscription) => subscription.request(1),
                        onNext: (value) => {
                            emitted2 = true;
                            sink.emitNext(value); // Эмитим значение из нового Mono
                        },
                        onError: (err) => {
                            emitted2 = true;
                            sink.emitError(err); // Если ошибка в новом Mono, передаем ошибку дальше
                        },
                        onComplete: () => {
                            if (!emitted2) sink.emitComplete(); // Завершаем поток, если новый Mono завершился
                        },
                    });
                },
                onComplete: () => {
                    if (!emitted) sink.emitComplete(); // Завершаем поток, если оригинальный Mono завершился
                },
            });
        });
    }


    /**
     * Подписывает переданного подписчика на текущий поток данных.
     * @param subscriber - Подписчик, обрабатывающий события потока.
     */
    public subscribe(subscriber: Subscriber<T>): void {
        // Передаем подписчику управление запросом и отменой подписки
        subscriber.onSubscribe({
            request: (n: number) => {
                if (n > 0) { // Добавляем подписчика, если запрос > 0
                    this.sink.addSubscriber(subscriber);
                    // Запускаем ленивый производитель данных, если он задан
                    this.producer?.call(this, this.sink);
                }
            },
            cancel: () => {
                this.sink.removeSubscriber(subscriber); // Удаляем подписчика
            },
        });
    }

    /**
     * Преобразует Mono в Promise, который выполняется при эмите значения.
     * @returns Promise с результатом или ошибкой.
     */
    public toPromise(): Promise<T> {
        return new Promise((resolve, reject) => {
            this.subscribe({
                onSubscribe: (subscription) => subscription.request(1),
                onNext: (value) => resolve(value), // Результат передается в resolve
                onError: (error) => reject(error), // Ошибка передается в reject
                onComplete: () => {
                    // Поток завершается без действий
                },
            });
        });
    }
}
