import Subscriber from "@/subscriber/Subscriber";
import Subscription from "@/subscription/Subscription";
import CorePublisher from "@/publisher/CorePublisher";
import Sinks, {Sink} from "sinks";
import Schedulers, {Scheduler} from "schedulers";

/**
 * Mono<T> - класс для работы с одним элементом данных или ошибкой.
 * Это подобие "реактивного" потока, который может содержать один элемент, ошибку или завершение.
 * Операции в классе Mono аналогичны тем, что есть в других реактивных библиотеках, таких как RxJS.
 */
export default class Mono<T> extends CorePublisher<T> {
    /**
     * Создаёт Mono, который сразу эмиттирует переданное значение.
     *
     * @param value - Значение, которое будет отправлено через поток.
     */
    public static just<T>(value: T): Mono<T> {
        return new Mono((sink) => sink.emitData(value));
    }

    /**
     * Создаёт Mono, который сразу эмиттирует переданное значение если то существует
     * В противном случае вернет пустой Mono
     *
     * @param value - Значение, которое будет отправлено через поток.
     */
    public static justOrEmpty<T>(value: T): Mono<T> {
        return value == null ? Mono.empty() : new Mono((sink) => sink.emitData(value));
    }

    /**
     * Создаёт Mono, который эмиттирует ошибку.
     *
     * @param error - Ошибка, которая будет отправлена в поток.
     */
    public static error<T>(error: Error): Mono<T> {
        return new Mono<T>((sink) => sink.emitError(error));
    }

    /**
     * Создаёт Mono, который сразу завершает поток (пустой поток).
     */
    public static empty<T>(): Mono<T> {
        return new Mono(sink => sink.emitClose());
    }

    /**
     * Создаёт Mono из Promise. Когда Promise завершится, он либо эмиттирует данные, либо ошибку.
     *
     * @param promise - Promise, который будет преобразован в Mono.
     */
    public static fromPromise<T>(promise: Promise<T>): Mono<T> {
        return new Mono<T>((sink) => promise
            .then((value) => sink.emitData(value))
            .catch((error) => sink.emitError(error))
        );
    }

    /**
     * Создаёт Mono с отложенной подпиской (Producer запускается при подписке).
     *
     * @param producer - Функция, которая будет запускать создание Mono при подписке.
     */
    public static defer<T>(producer: () => Mono<T>): Mono<T> {
        return new Mono<T>((sink) => {
            producer().fullyStep(null, null, null, sink).subscribe()
        });
    }

    /**
     * Обработчик данных, ошибок и завершения, позволяет использовать кастомные функции для обработки.
     *
     * @param onNext - Функция для обработки данных.
     * @param onError - Функция для обработки ошибок.
     * @param onComplete - Функция для обработки завершения.
     * @param current - Текущий Sink, куда будут эмиттироваться данные.
     */
    private fullyStep<U>(onNext?: (sink: Sink<U>, data: T) => void, onError?: (sink: Sink<U>, error: Error) => void, onComplete?: (sink: Sink<U>) => void, current?: Sink<U>) {
        return new Mono<U>(sink => {
            const target = current || sink;
            this.subscribe({
                onNext(data: T) {
                    try {
                        onNext ? onNext(target, data) : target.emitData(data as unknown as U)
                    } catch (e) {
                        try {
                            target.emitError(e);
                        } catch (e) {
                        }
                    }
                },
                onError(error: Error) {
                    try {
                        onError ? onError(target, error) : target.emitError(error)
                    } catch (e) {
                        try {
                            target.emitError(e);
                        } catch (e) {
                        }
                    }
                },
                onComplete() {
                    try {
                        onComplete ? onComplete(target) : target.emitClose()
                    } catch (e) {
                        try {
                            target.emitError(e);
                        } catch (e) {
                        }
                    }
                }
            })
        })
    }

    /**
     * Метод создает новый поток, который выполняет обработку данных через переданный обработчик.
     * Этот метод использует только обработку данных (не ошибок и не завершений), и может быть полезен
     * для построения цепочек обработки данных.
     * @param onNext - функция, которая будет вызвана каждый раз, когда в поток поступает новое значение.
     * @param current - (необязательный параметр) текущий Sink, через который данные будут передаваться.
     * @returns Новый поток (Mono<U>), который обрабатывает данные с использованием `onNext`.
     */
    private step<U>(onNext: (sink: Sink<U>, data: T) => void, current?: Sink<U>) {
        return this.fullyStep(onNext, null, null, current)
    }

    /**
     * Применяет оператор "map" к данным, преобразуя их в новый тип.
     *
     * @param mapper - Функция, которая преобразует данные в новый тип.
     */
    public map<U>(mapper: (value: T) => U): Mono<U> {
        return this.step((sink, data) => sink.emitData(mapper(data)))
    }

    /**
     * Преобразует данные с фильтрацией значений (значения не могут быть null).
     */
    public mapNotNull<U>(mapper: (value: T) => U): Mono<U> {
        return this.map(mapper).filter(value => value != null)
    }

    /**
     * Применяет оператор "flatMap", который позволяет сделать вложенную подписку на данные другого Mono.
     *
     * @param mapper - Функция, которая генерирует новый Mono для каждого элемента.
     */
    public flatMap<U>(mapper: (value: T) => Mono<U>): Mono<U> {
        return this.step((sink, data) => mapper(data)
            .step((otherSink, otherData) => otherSink.emitData(otherData), sink)
            .subscribe()
        )
    }

    /**
     * Фильтрует данные по условию.
     *
     * @param predicate - Условие для фильтрации данных.
     */
    public filter(predicate: (value: T) => boolean): Mono<T> {
        return this.step((sink, data) => predicate(data) ? sink.emitData(data) : sink.emitClose())
    }

    /**
     * Метод фильтрует элементы текущего потока, используя асинхронное условие, которое возвращает
     * новый поток Mono<boolean>. Если условие возвращает true, элемент пропускается; если false — отфильтровывается.
     * @param predicate - функция, которая на основе значения из текущего потока генерирует новый поток
     *                    Mono<boolean>, а тот определяет, должен ли элемент быть пропущен.
     * @returns Новый поток (Mono<T>), содержащий только те элементы, которые удовлетворяют условию.
     */
    public filterWhen(predicate: (value: T) => Mono<boolean>): Mono<T> {
        return this.flatMap(value => predicate(value)
            .filter(result => result)
            .map(() => value))
    }

    /**
     * Метод комбинирует данные из текущего потока с данными из другого потока
     * и возвращает новый результат, используя переданную функцию-комбинатор.
     * @param other - другой поток (Mono<T2>), с которым будет комбинирован текущий поток.
     * @param combiner - функция, которая комбинирует два значения из текущего потока
     *                   и из потока `other` в одно значение типа R.
     * @returns Новый поток (Mono<R>) с результатами комбинирования.
     */
    public zipWith<T2, R>(other: Mono<T2>, combiner: (value1: T, value2: T2) => R): Mono<R> {
        return this.zipWhen(() => other, combiner);
    }

    /**
     * Метод комбинирует данные из текущего потока с данными, полученными из другого потока,
     * который генерируется на основе значения из текущего потока. Это позволяет асинхронно
     * создать второй поток, используя переданную функцию.
     * @param fn - функция, которая на основе значения из текущего потока генерирует новый поток Mono<T2>.
     * @param combiner - функция, которая комбинирует значения из текущего потока и нового потока
     *                   (генерируемого функцией `fn`), в один результат типа R.
     * @returns Новый поток (Mono<R>) с результатами комбинирования.
     */
    public zipWhen<T2, R>(fn: (value: T) => Mono<T2>, combiner: (value1: T, value2: T2) => R): Mono<R> {
        return this.flatMap(value => fn(value)
            .map(other => combiner(value, other)))
    }

    /**
     * Важный оператор для асинхронных потоков. Если исходный Mono не эмиттирует данные,
     * будет выполнен запасной Mono.
     *
     * @param alternate - Альтернативный Mono, который будет эмиттировать данные, если исходный Mono пуст.
     */
    public switchIfEmpty(alternate: Mono<T>): Mono<T> {
        let empty = true;
        return this.fullyStep((sink, data) => {
            empty = false
            sink.emitData(data)
        }, (sink, error) => {
            empty = false
            sink.emitError(error)
        }, sink => {
            if (empty) alternate.step((other, data) => other.emitData(data), sink).subscribe()
            else sink.emitClose()
        })
    }

    /**
     * Проверяет, существует ли хотя бы один элемент в потоке.
     * Возвращает Mono, который эмиттирует true, если хотя бы один элемент был эмиттирован,
     * или false, если поток пустой.
     */
    public hasElement(): Mono<boolean> {
        return this.map(() => true).switchIfEmpty(Mono.just(false));
    }

    /**
     * Оператор для возврата альтернативного потока в случае ошибки.
     *
     * @param alternate - Альтернативный Mono для обработки ошибок.
     */
    public onErrorReturn(alternate: Mono<T>): Mono<T> {
        return this.fullyStep(null, (sink, error) => {
            alternate.step((other, data) => other.emitData(data), sink).subscribe()
        }, null)
    }

    public onErrorContinue(): Mono<T> {
        return this.onErrorReturn(Mono.empty())
    }

    /**
     * Преобразует данные в новый тип.
     */
    public cast<U>(): Mono<U> {
        return this.map(value => value as unknown as U);
    }

    /**
     * Операция для выполнения побочного эффекта при каждом поступлении данных.
     *
     * @param action - Функция, которая выполняет побочный эффект.
     */
    public doOnNext(action: (value: T) => void): Mono<T> {
        return this.map(value => {
            action(value);
            return value;
        })
    }

    /**
     * Выполняет действие перед тем, как поток начнёт эмиттировать данные.
     */
    public doFirst(action: () => void): Mono<T> {
        return new Mono(sink => {
            try {
                action()
            } catch (e) {
                sink.emitError(e)
            }
            this.fullyStep(null, null, null, sink).subscribe()
        })
    }

    /**
     * Выполняет действие при завершении потока (после того, как данные были эмиттированы).
     */
    public doFinally(action: () => void): Mono<T> {
        return this.fullyStep(null, null, sink => {
            try {
                sink.emitClose()
            } finally {
                action()
            }
        })
    }

    /**
     * Оператор для асинхронной работы с потоками, который переносит выполнение в указанный планировщик.
     */
    public publishOn(scheduler: Scheduler): Mono<T> {
        return this.fullyStep(
            (sink, data) => scheduler.schedule(() => {
                try {
                    sink.emitData(data)
                } catch (e) {
                    try {
                        sink.emitError(e)
                    } catch (e) {
                    }
                }
            }),
            (sink, error) => scheduler.schedule(() => {
                try {
                    sink.emitError(error)
                } catch (e) {
                    try {
                        sink.emitError(e)
                    } catch (e) {
                    }
                }
            }),
            (sink) => scheduler.schedule(() => {
                try {
                    sink.emitClose()
                } catch (e) {
                    try {
                        sink.emitError(e)
                    } catch (e) {
                    }
                }
            })
        )
    }

    /**
     * Оператор для работы с потоком на определённом планировщике (например, для выполнения на отдельном потоке).
     */
    public subscribeOn(scheduler: Scheduler): Mono<T> {
        return new Mono(sink => {
            scheduler.schedule(() => {
                this.fullyStep(
                    (other, data) => {
                        try {
                            other.emitData(data);
                        } catch (e) {
                            try {
                                other.emitError(e)
                            } catch (e) {
                            }
                        }
                    },
                    (other, error) => {
                        try {
                            other.emitError(error)
                        } catch (e) {
                            try {
                                other.emitError(e)
                            } catch (e) {
                            }
                        }
                    },
                    (other) => {
                        try {
                            other.emitClose()
                        } catch (e) {
                            try {
                                other.emitError(e)
                            } catch (e) {
                            }
                        }
                    },
                    sink
                ).subscribe();
            })
        });
    }

    /**
     * Тайм-аут для потока. Если данные не приходят вовремя, будет выброшена ошибка.
     */
    public timeout(duration: number): Mono<T> {
        return new Mono<T>(sink => {
            let scheduler = Schedulers.delay(duration).schedule(() => {
                try {
                    sink.emitError(new Error("Timeout"))
                } catch (e) {
                }
                scheduler = null;
            });
            this.fullyStep(
                (other, data) => {
                    if (scheduler != null) {
                        scheduler.cancel()
                        try {
                            other.emitData(data);
                        } catch (e) {
                            try {
                                other.emitError(e)
                            } catch (e) {
                            }
                        }
                    }
                },
                (other, error) => {
                    if (scheduler != null) {
                        scheduler.cancel()
                        try {
                            other.emitError(error);
                        } catch (e) {
                            try {
                                other.emitError(e)
                            } catch (e) {
                            }
                        }
                    }
                },
                (other) => {
                    if (scheduler != null) {
                        scheduler.cancel()
                        try {
                            other.emitClose()
                        } catch (e) {
                            try {
                                other.emitError(e)
                            } catch (e) {
                            }
                        }
                    }
                },
                sink
            ).subscribe();
        });
    }

    /**
     * Преобразует Mono в Promise.
     */
    public toPromise(): Promise<T> {
        return new Promise((resolve, reject) => {
            this.subscribe({
                onNext: resolve,
                onError: reject,
                onComplete: () => {
                },
            });
        });
    }

    /**
     * Создаёт Sink для подписки.
     */
    protected createSink(): Sink<T> {
        return Sinks.one();
    }

    /**
     * Подписывается на поток данных.
     *
     * @param subscriber - Подписчик или функция подписки.
     */
    public subscribe(subscriber?: ((data: T) => void) | Subscriber<T>): void {
        (super.subscribe(subscriber) as Subscription).request(1);
    }
}