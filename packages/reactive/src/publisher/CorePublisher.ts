import Subscriber from "../subscriber/Subscriber";
import Subscription from "../subscription/Subscription";
import {Listener, Signal, Sink} from "sinks";
import PipePublisher from "@/publisher/PipePublisher";
import Schedulers, {Scheduler} from "schedulers";

/**
 * Абстрактный класс для реализации издателя (Publisher), который управляет подписчиками
 * и потоками данных. Этот класс предоставляет основные методы для обработки данных,
 * управления подписками, а также трансформации и фильтрации потоков.
 */
export default abstract class CorePublisher<T> implements PipePublisher<T> {
    protected sink: Sink<T>;
    protected readonly producer: (sink: Sink<T>, count: number) => void;

    /**
     * Конструктор издателя.
     *
     * @param producer - Функция, генерирующая события (например, данные, ошибки, завершение потока),
     * передающая их в sink. Количество запрошенных элементов передается как аргумент count.
     */
    protected constructor(producer: (sink: Sink<T>, count: number) => void) {
        this.sink = this.createSink();
        this.producer = producer;
    }

    /**
     * Абстрактный метод, который должен создавать новый Sink для обработки данных.
     *
     * Реализация предоставляется в подклассах.
     */
    protected abstract createSink(): Sink<T>;

    /**
     * Подписка на поток данных.
     *
     * @param subscriber - Либо функция, обрабатывающая данные, либо объект, реализующий интерфейс Subscriber<T>.
     * Если передана функция, она будет обработчиком только для данных.
     *
     * @returns Объект Subscription, который предоставляет методы для управления подпиской
     * (например, запрос данных или отмена подписки).
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
                    subscriber.onComplete?.()
                    break;
                }
            }
        }
    }

    /**
     * Нормализует подписчика. Если подписчик представлен функцией,
     * преобразует его в объект, реализующий интерфейс Subscriber.
     */
    protected static normalizeSubscriber<T>(subscriber: ((data: T) => void) | Subscriber<T>): Subscriber<T> {
        if (typeof subscriber == "function") {
            return {
                onNext: subscriber,
            } as Subscriber<T>
        }
        return subscriber
    }

    /**
     * Преобразует текущий поток данных с помощью операции.
     *
     * @param operation - Функция, которая создает подписчика для обработки данных.
     * @param transit - Временный Sink для передачи данных (необязательно).
     * @param scheduler - Планировщик для выполнения операций (по умолчанию используется immediate).
     *
     * @returns Новый объект CorePublisher для преобразованного потока.
     */
    public pipe<U>(operation: (sink: Sink<U>, count: number) => ((data: T) => void) | Subscriber<T>, transit?: Sink<U>, scheduler: Scheduler = Schedulers.immediate()): CorePublisher<U> {
        return Reflect.construct(Reflect.getPrototypeOf(this).constructor, [(sink: Sink<U>, count: number) => {
            const subscriber = CorePublisher.normalizeSubscriber(operation(transit || sink, count));
            scheduler.schedule(() => {
                const soft = (fn: () => void) => {
                    try {
                        fn()
                    } catch (e) {
                        try {
                            (transit || sink).emitError(e);
                        } catch (e) {
                        }
                    }
                }
                (this.subscribe({
                    onNext(data: T) {
                        soft(() => subscriber.onNext ? subscriber.onNext(data) : (transit || sink).emitData(data as unknown as U))
                    },
                    onError(error: Error) {
                        soft(() => subscriber.onError ? subscriber.onError(error) : (transit || sink).emitError(error))
                    },
                    onComplete() {
                        soft(() => subscriber.onComplete ? subscriber.onComplete() : (transit || sink).emitClose())
                    }
                }) as Subscription)?.request(Number.MAX_SAFE_INTEGER)
            })
        }])
    }

    /**
     * Преобразует элементы потока с помощью переданной функции.
     *
     * @param mapper - Функция для преобразования элементов потока.
     *
     * @returns Новый объект CorePublisher для преобразованного потока.
     */
    public map<U>(mapper: (value: T) => U): CorePublisher<U> {
        return this.pipe((sink) => {
            return data => {
                sink.emitData(mapper(data))
            }
        })
    }

    /**
     * Преобразует элементы потока с помощью функции и фильтрует результаты, исключая null значения.
     *
     * @param mapper - Функция для преобразования значений потока.
     *
     * @returns Новый CorePublisher, в котором будут только те элементы, которые не равны null.
     */
    public mapNotNull<U>(mapper: (value: T) => U): CorePublisher<U> {
        return this.map(mapper).filter(value => value != null)
    }

    /**
     * Преобразует поток данных в другой тип.
     * Этот метод должен быть реализован в дочерних классах, поскольку его поведение зависит от
     * того, как будет производиться кастинг или преобразование данных.
     *
     * @returns Новый CorePublisher с другим типом данных.
     */
    public abstract cast<U>(): CorePublisher<U>

    /**
     * Выполняет действие перед тем, как начнется обработка данных в потоке.
     *
     * @param action - Функция, которая будет выполнена перед обработкой данных.
     *
     * @returns Новый CorePublisher, который продолжит работу с исходным потоком.
     */
    public doFirst(action: () => void): CorePublisher<T> {
        return this.pipe(sink => {
            try {
                action()
            } catch (e) {
                sink.emitError(e)
            }
            return {}
        })
    }

    /**
     * Выполняет действие при получении каждого элемента потока данных.
     *
     * @param action - Функция, которая будет выполнена для каждого элемента потока.
     *
     * @returns Новый CorePublisher, который продолжает обработку потока, но с дополнительным действием.
     */
    public doOnNext(action: (value: T) => void): PipePublisher<T> {
        return this.map(value => {
            action(value);
            return value;
        })
    }

    /**
     * Выполняет действие, когда поток завершает свою работу, независимо от результата.
     *
     * @param action - Функция, которая будет выполнена при завершении потока.
     *
     * @returns Новый CorePublisher с тем же потоком, но с добавлением действия в конце.
     */
    public doFinally(action: () => void): PipePublisher<T> {
        return this.pipe(sink => {
            return {
                onComplete() {
                    try {
                        sink.emitClose()
                    } finally {
                        action()
                    }
                }
            }
        })
    }

    /**
     * Фильтрует поток данных, пропуская только те элементы, которые соответствуют условию.
     * Этот метод должен быть реализован в дочерних классах.
     *
     * @param predicate - Функция, которая возвращает true или false для каждого элемента потока.
     *
     * @returns Новый CorePublisher, содержащий только те элементы, которые прошли фильтрацию.
     */
    abstract filter(predicate: (value: T) => boolean): CorePublisher<T>

    /**
     * Фильтрует поток данных, но условие для фильтрации зависит от результата выполнения
     * другого потока (PipePublisher), который предоставляет булево значение.
     *
     * @param predicate - Функция, которая возвращает новый PipePublisher с булевым значением.
     *
     * @returns Новый CorePublisher с отфильтрованными данными.
     */
    public filterWhen(predicate: (value: T) => PipePublisher<boolean>): CorePublisher<T> {
        return this.flatMap(value => predicate(value)
            .filter(result => result)
            .map(() => value))
    }

    /**
     * Выполняет операцию, которая изменяет элементы потока, создавая новый поток для каждого элемента.
     * Этот метод должен быть реализован в дочерних классах.
     *
     * @param mapper - Функция, которая преобразует элемент потока в новый PipePublisher.
     *
     * @returns Новый CorePublisher, представляющий измененный поток.
     */
    abstract flatMap<U>(mapper: (value: T) => PipePublisher<U>): CorePublisher<U>;

    /**
     * Обрабатывает ошибку потока таким образом, чтобы поток продолжал работу после ошибки.
     * Этот метод должен быть реализован в дочерних классах.
     *
     * @returns Новый CorePublisher, в котором потоки продолжают работу даже после ошибки.
     */
    abstract onErrorContinue(): CorePublisher<T>;

    /**
     * В случае ошибки возвращает элементы из альтернативного потока (PipePublisher).
     *
     * @param alternate - Альтернативный поток, из которого будут браться элементы в случае ошибки.
     *
     * @returns Новый CorePublisher, который использует альтернативный поток при ошибке.
     */
    public onErrorReturn(alternate: PipePublisher<T>): CorePublisher<T> {
        return this.pipe(sink => {
            return {
                onError() {
                    alternate.pipe(other => data => other.emitData(data), sink)
                        .subscribe()?.request(Number.MAX_SAFE_INTEGER)
                }
            }
        })
    }

    /**
     * Переносит обработку данных на другой планировщик (например, для асинхронных операций).
     *
     * @param scheduler - Планировщик, на котором будут выполняться операции.
     *
     * @returns Новый CorePublisher, который будет работать с потоком на другом планировщике.
     */
    public publishOn(scheduler: Scheduler): CorePublisher<T> {
        return this.pipe(sink => {
            return {
                onNext(data: T) {
                    scheduler.schedule(() => sink.emitData(data))
                },
                onError(error: Error) {
                    scheduler.schedule(() => sink.emitError(error))
                },
                onComplete() {
                    scheduler.schedule(() => sink.emitClose())
                }
            }
        })
    }

    /**
     * Запускает обработку потока на указанном планировщике (например, для управления асинхронностью).
     *
     * @param scheduler - Планировщик, на котором будет инициирован процесс обработки.
     *
     * @returns Новый CorePublisher с операциями, которые будут выполняться на другом планировщике.
     */
    public subscribeOn(scheduler: Scheduler): CorePublisher<T> {
        return this.pipe(() => {
            return {}
        }, null, scheduler)
    }

    /**
     * В случае, если поток данных пуст (не содержит данных), возвращает данные из альтернативного Publisher.
     *
     * @param alternate - Альтернативный Publisher, который будет использован, если поток пуст.
     *
     * @returns Новый CorePublisher, который использует альтернативный Publisher при отсутствии данных.
     */
    public switchIfEmpty(alternate: PipePublisher<T>): CorePublisher<T> {
        return this.pipe(sink => {
            let empty = true;
            return {
                onNext(data: T) {
                    empty = false
                    sink.emitData(data)
                },
                onError(error: Error) {
                    empty = false
                    sink.emitError(error)
                },
                onComplete() {
                    if (empty) alternate.pipe(() => {
                        return {}
                    }, sink).subscribe()?.request(Number.MAX_SAFE_INTEGER)
                    else sink.emitClose()
                }
            }
        })
    }

    /**
     * Ограничивает время ожидания данных. Если данные не поступили в течение указанного времени,
     * генерируется ошибка таймаута.
     *
     * @param duration - Время в миллисекундах, после которого возникает ошибка таймаута.
     *
     * @returns Новый CorePublisher, который будет генерировать ошибку, если данные не поступят вовремя.
     */
    public timeout(duration: number): CorePublisher<T> {
        return this.pipe(sink => {
            let scheduler = Schedulers.delay(duration).schedule(() => {
                try {
                    sink.emitError(new Error("Timeout"))
                } catch (e) {
                }
                scheduler = null;
            });
            const soft = (fn: () => void) => {
                if (scheduler != null) {
                    scheduler.cancel()
                    try {
                        fn();
                    } catch (e) {
                        try {
                            sink.emitError(e)
                        } catch (e) {
                        }
                    }
                }
            }
            return {
                onNext(data: T) {
                    soft(() => sink.emitData(data))
                },
                onError(error: Error) {
                    soft(() => sink.emitError(error))
                },
                onComplete() {
                    soft(() => sink.emitClose())
                }
            }
        })
    }
}