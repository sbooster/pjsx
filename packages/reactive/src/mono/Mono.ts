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
            try {
                let emitted = false;
                this.subscribe({
                    onSubscribe: (subscription) => subscription.request(1),
                    onNext: (value) => {
                        emitted = true;
                        sink.emitNext(mapper(value))
                    },
                    onError: (error) => {
                        emitted = true;
                        sink.emitError(error)
                    },
                    onComplete: () => {
                        if (!emitted) sink.emitComplete()
                    },
                });
            } catch (exception) {
                sink.emitError(exception)
            }
        });
    }

    /**
     * Оператор mapNotNull: преобразует значения и фильтрует null.
     */
    public mapNotNull<U>(mapper: (value: T) => U | null): Mono<U> {
        return new Mono<U>(Sinks.one(), (sink) => {
            try {
                let emitted = false;
                this.subscribe({
                    onSubscribe: (subscription) => subscription.request(1),
                    onNext: (value) => {
                        emitted = true;
                        const mappedValue = mapper(value);
                        if (mappedValue !== null) sink.emitNext(mappedValue);
                        else sink.emitComplete();
                    },
                    onError: (error) => {
                        emitted = true;
                        sink.emitError(error)
                    },
                    onComplete: () => {
                        if (!emitted) sink.emitComplete()
                    },
                });
            } catch (exception) {
                sink.emitError(exception)
            }
        });
    }

    /**
     * Оператор flatMap: преобразует значение в новый Mono.
     */
    public flatMap<U>(mapper: (value: T) => Mono<U>): Mono<U> {
        return new Mono<U>(Sinks.one(), (sink) => {
            try {
                let emitted = false;
                this.subscribe({
                    onSubscribe: (subscription) => subscription.request(1),
                    onNext: (value) => {
                        emitted = true;
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
                    },
                    onError: (error) => {
                        emitted = true;
                        sink.emitError(error)
                    },
                    onComplete: () => {
                        if (!emitted) sink.emitComplete()
                    },
                });
            } catch (exception) {
                sink.emitError(exception)
            }
        });
    }

    /**
     * Оператор filter: пропускает элементы, которые удовлетворяют предикату.
     */
    public filter(predicate: (value: T) => boolean): Mono<T> {
        return new Mono<T>(Sinks.one(), (sink) => {
            try {
                let emitted = false
                this.subscribe({
                    onSubscribe: (subscription) => subscription.request(1),
                    onNext: (value) => {
                        emitted = true
                        if (predicate(value)) sink.emitNext(value);
                        else sink.emitComplete(); // Завершаем, если предикат не выполняется
                    },
                    onError: (error) => {
                        emitted = true;
                        sink.emitError(error)
                    },
                    onComplete: () => {
                        if (!emitted) sink.emitComplete()
                    },
                });
            } catch (exception) {
                sink.emitError(exception)
            }
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
            try {
                let emitted = false;
                this.subscribe({
                    onSubscribe: (subscription) => subscription.request(1),
                    onNext: (value) => {
                        emitted = true;
                        sink.emitNext(value)
                    },
                    onError: (error) => {
                        emitted = true;
                        sink.emitError(error);
                    },
                    onComplete: () => {
                        action(); // не сработает в конце, а сработает сразу если не будет onNext или onError (например если у нас Mono#empty). Исправь!
                        if (!emitted) {
                            sink.emitComplete()
                        }
                    },
                });
            } catch (exception) {
                sink.emitError(exception)
            }
        });
    }

    /**
     * Оператор doOnNext: выполняет действие при эмите значения.
     */
    public doOnNext(action: (value: T) => void): Mono<T> {
        return new Mono<T>(Sinks.one(), (sink) => {
            try {
                let emitted = false;
                this.subscribe({
                    onSubscribe: (subscription) => subscription.request(1),
                    onNext: (value) => {
                        emitted = true;
                        action(value);
                        sink.emitNext(value);
                    },
                    onError: (error) => {
                        emitted = true;
                        sink.emitError(error)
                    },
                    onComplete: () => {
                        if (!emitted) sink.emitComplete()
                    },
                });
            } catch (exception) {
                sink.emitError(exception)
            }
        });
    }

    /**
     * Оператор switchIfEmpty: переключается на другой Mono, если поток пуст.
     */
    public switchIfEmpty(alternate: Mono<T>): Mono<T> {
        return new Mono<T>(Sinks.one(), (sink) => {
            try {
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
            } catch (exception) {
                sink.emitError(exception)
            }
        });
    }

    // todo добавь еще onerrormap

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
