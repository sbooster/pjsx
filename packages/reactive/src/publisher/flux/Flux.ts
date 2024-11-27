import CorePublisher from "@/publisher/CorePublisher";
import Subscriber from "@/subscriber/Subscriber";
import Subscription from "@/subscription/Subscription";
import Mono from "@/publisher/mono/Mono";
import PipePublisher from "@/publisher/PipePublisher";

import {Sinks, Sink} from "sinks";
import {Schedulers, Scheduler} from "schedulers";

/**
 * Класс Flux представляет собой поток данных, который может быть преобразован, фильтруем, подписан и обработан.
 * Flux является конкретной реализацией абстракции CorePublisher и предоставляет удобные методы
 * для работы с потоками данных, такими как map, filter, flatMap, и другие.
 *
 * @template T Тип данных, передаваемых в поток.
 */
export default class Flux<T> extends CorePublisher<T> {
    /**
     * Конструктор Flux, который инициализирует поток данных с использованием указанного продюсера.
     *
     * @param producer Функция, которая будет использоваться для создания данных в потоке.
     */
    constructor(producer: (sink: Sink<T>, count: number) => void) {
        super(producer);
    }

    /**
     * Создает новый экземпляр Flux из существующего Sink.
     *
     * @param sink Исходный Sink, из которого будет получен поток данных.
     *
     * @returns Новый Flux.
     */
    public static from<T>(sink: Sink<T>): Flux<T> {
        return new Flux<T>((inner) => {
            sink.addListener(Flux.adaptSubscriber({
                onNext(data: T): void {
                    inner.emitData(data)
                },
                onError(error: Error): void {
                    inner.emitError(error)
                },
                onComplete(): void {
                    inner.emitClose()
                }
            }))
        });
    }

    /**
     * Создает новый Flux из Iterable объекта (например, массива).
     *
     * @param iterable Итерабельный объект, элементы которого будут переданы в поток.
     *
     * @returns Новый Flux.
     */
    public static fromIterable<T>(iterable: Iterable<T>): Flux<T> {
        return new Flux((sink) => {
            for (const item of iterable) {
                sink.emitData(item);
            }
            sink.emitClose();
        })
    }

    /**
     * Статический метод для создания пустого потока, который немедленно завершает выполнение,
     * не эмитируя никаких данных или ошибок.
     * Этот поток может быть полезен, когда нужно использовать "пустой" поток в качестве заглушки.
     *
     * @returns Новый пустой поток данных.
     */
    public static empty<T>(): Flux<T> {
        return new Flux<T>((sink) => {
            sink.emitClose();
        });
    }

    /**
     * Создает новый поток (Flux), который эмитирует последовательность чисел от start (включительно)
     * до start + count (не включая).
     *
     * @param start - Начальное значение для последовательности.
     * @param count - Количество элементов в последовательности.
     * @returns Новый поток, который эмитирует числа от start до start + count (не включая).
     */
    public static range(start: number, count: number): Flux<number> {
        return new Flux(sink => {
            let current = start;
            for (let i = 0; i < count; i++) {
                sink.emitData(current++);
            }
            sink.emitClose();
        });
    }

    /**
     * Создает Flux с отложенной инициализацией потока.
     *
     * @param producer Функция возвращающая Flux, данные из которого будут переданы в новый поток.
     *
     * @returns Новый Flux.
     */
    public static defer<T>(producer: () => Flux<T>): Flux<T> {
        return new Flux<T>((sink) => {
            producer().pipe(() => {
                return {}
            }, sink).subscribe()?.request(Number.MAX_SAFE_INTEGER)
        });
    }

    /**
     * Создает Sink для потока данных.
     *
     * @returns Новый Sink, который будет использоваться для обработки данных.
     */
    protected createSink(): Sink<T> {
        return Sinks.many().unicast();
    }

    /**
     * Преобразует Flux в новый Flux с другим типом данных.
     *
     * @template U Тип данных для нового Flux.
     *
     * @returns Новый Flux с типом U.
     */
    public cast<U>(): Flux<U> {
        return this as unknown as Flux<U>
    }

    /**
     * Фильтрует данные потока, пропуская только те элементы, которые соответствуют условию.
     *
     * @param predicate Функция, которая проверяет, подходит ли элемент для передачи.
     *
     * @returns Новый Flux с отфильтрованными данными.
     */
    public filter(predicate: (value: T) => boolean): Flux<T> {
        return this.pipe(sink => data => predicate(data) ? sink.emitData(data) : undefined)
    }

    /**
     * Прерывает поток данных, если произошла ошибка.
     * Этот метод должен быть реализован для обработки ошибок и продолжения потока.
     *
     * @returns Новый Flux с обработкой ошибок.
     */
    public onErrorContinue(): Flux<T> {
        return this.onErrorReturn(Flux.empty())
    }

    /**
     * Обрабатывает ситуацию, когда поток данных пуст, и переключается на альтернативный поток.
     *
     * @param alternate Альтернативный поток, который будет использован в случае пустого потока.
     *
     * @returns Новый Flux, который переключается на альтернативный поток, если исходный пуст.
     */
    public switchIfEmpty(alternate: Flux<T>): Flux<T> {
        return super.switchIfEmpty(alternate) as Flux<T>
    }

    /**
     * Возвращает первый элемент из потока данных.
     * Если данные не поступают, будет вызвано завершение потока.
     *
     * @returns Mono с первым элементом потока.
     */
    public first(): Mono<T> {
        return new Mono(sink => {
            const soft = (fn: () => void) => {
                try {
                    fn()
                } catch (e) {
                    try {
                        sink.emitError(e);
                    } catch (e) {
                    }
                }
            }
            this.subscribe({
                onNext(data: T) {
                    soft(() => sink.emitData(data))
                },
                onError(error: Error) {
                    soft(() => sink.emitError(error))
                },
                onComplete() {
                    soft(() => sink.emitClose())
                }
            }).request(1)
        })
    }

    /**
     * Подписка на поток данных с обработчиком событий.
     *
     * @param subscriber Обработчик для обработки полученных данных, ошибок и завершения.
     *
     * @returns Subscription, который можно использовать для управления подпиской.
     */
    public subscribe(subscriber?: ((data: T) => void) | Subscriber<T>): Subscription {
        const sub = CorePublisher.adaptSubscriber(subscriber || (() => {
        }));
        let buffer = this.sink.buffer();
        buffer.addListener(sub)
        let produceOnce = (count: number) => {
            this.producer(this.sink, count)
            produceOnce = () => {
            }
        }
        return {
            request: (count: number) => {
                produceOnce(count)
                buffer.request(count)
            },
            unsubscribe: () => {
                buffer.removeListener(sub)
            }
        }
    }

    /**
     * Применяет операцию к потоку данных, преобразуя его и передавая в новый поток.
     *
     * @template U Новый тип данных для потока.
     * @param operation Операция, которая будет применена к данным потока.
     * @param transit Необязательный параметр для передачи потока данных в другой Sink.
     * @param scheduler Планировщик для асинхронной обработки (по умолчанию immediate).
     *
     * @returns Новый Flux с преобразованными данными.
     */
    public pipe<U>(operation: (sink: Sink<U>, count: number) => (((data: T) => void) | Subscriber<T>), transit?: Sink<U>, scheduler: Scheduler = Schedulers.immediate()): Flux<U> {
        return super.pipe(operation, transit, scheduler) as Flux<U>;
    }

    /**
     * Преобразует элементы потока с помощью указанной функции.
     *
     * @template U Новый тип данных для потока.
     * @param mapper Функция для преобразования каждого элемента потока.
     *
     * @returns Новый Flux с преобразованными данными.
     */
    public map<U>(mapper: (value: T) => U): Flux<U> {
        return super.map(mapper) as Flux<U>;
    }

    /**
     * Преобразует элементы потока и фильтрует null значения.
     *
     * @template U Новый тип данных для потока.
     * @param mapper Функция для преобразования каждого элемента.
     *
     * @returns Новый Flux с отфильтрованными данными.
     */
    public mapNotNull<U>(mapper: (value: T) => U): Flux<U> {
        return super.mapNotNull(mapper) as Flux<U>;
    }

    /**
     * Выполняет действие перед началом обработки потока.
     *
     * @param action Действие, которое будет выполнено до обработки данных.
     *
     * @returns Новый Flux с дополнительным действием перед обработкой.
     */
    public doFirst(action: () => void): Flux<T> {
        return super.doFirst(action) as Flux<T>;
    }

    /**
     * Выполняет действие при каждом получении элемента из потока.
     *
     * @param action Действие, которое будет выполнено для каждого элемента потока.
     *
     * @returns Новый Flux с дополнительным действием для каждого элемента.
     */
    public doOnNext(action: (value: T) => void): Flux<T> {
        return super.doOnNext(action) as Flux<T>;
    }

    /**
     * Выполняет действие при завершении обработки потока.
     *
     * @param action Действие, которое будет выполнено после завершения потока.
     *
     * @returns Новый Flux с дополнительным действием при завершении.
     */
    public doFinally(action: () => void): Flux<T> {
        return super.doFinally(action) as Flux<T>;
    }

    /**
     * Фильтрует элементы потока, используя асинхронную логику.
     *
     * @param predicate Асинхронная функция для фильтрации элементов потока.
     *
     * @returns Новый Flux с отфильтрованными данными.
     */
    public filterWhen(predicate: (value: T) => Mono<boolean>): Flux<T> {
        return super.filterWhen(predicate) as Flux<T>;
    }

    /**
     * Преобразует элементы потока с использованием другого потока для каждого элемента.
     *
     * @template U Новый тип данных для потока.
     * @param mapper Функция, которая создает новый PipePublisher для каждого элемента.
     *
     * @returns Новый Flux с преобразованными данными.
     */
    public flatMap<U>(mapper: (value: T) => PipePublisher<U>): Flux<U> {
        return this.pipe(sink => {
            return {
                onNext(data: T) {
                    mapper(data)
                        .pipe(() => {
                            return {
                                onComplete() {
                                }
                            }
                        }, sink)
                        .subscribe()?.request(Number.MAX_SAFE_INTEGER)
                }
            }
        })
    }

    /**
     * Возвращает альтернативный поток, если произошла ошибка в текущем потоке.
     *
     * @param alternate Альтернативный Flux, который будет возвращен в случае ошибки.
     *
     * @returns Новый Flux с обработкой ошибок.
     */
    public onErrorReturn(alternate: Flux<T>): Flux<T> {
        return super.onErrorReturn(alternate) as Flux<T>;
    }

    /**
     * Переносит поток на выполнение другого планировщика (например, в асинхронном режиме).
     *
     * @param scheduler Планировщик для обработки потока.
     *
     * @returns Новый Flux с измененным планировщиком.
     */
    public publishOn(scheduler: Scheduler): Flux<T> {
        return super.publishOn(scheduler) as Flux<T>;
    }

    /**
     * Устанавливает планировщик для подписки.
     *
     * @param scheduler Планировщик для подписки на поток.
     *
     * @returns Новый Flux с измененным планировщиком подписки.
     */
    public subscribeOn(scheduler: Scheduler): Flux<T> {
        return super.subscribeOn(scheduler) as Flux<T>;
    }

    /**
     * Добавляет тайм-аут для обработки потока.
     *
     * @param duration Время ожидания (в миллисекундах) перед завершением потока.
     *
     * @returns Новый Flux с тайм-аутом.
     */
    public timeout(duration: number): Flux<T> {
        return super.timeout(duration) as Flux<T>;
    }

    /**
     * Метод для сбора всех значений потока данных в массив.
     * Возвращает объект типа `Mono<Array<T>>`, который эмитирует массив всех собранных значений.
     *
     * @returns {Mono<Array<T>>} Моно-поток, который эмитирует массив всех данных, переданных через поток.
     */
    public collect(): Mono<Array<T>> {
        return new Mono(sink => {
            const soft = (fn: () => void) => {
                try {
                    fn()
                } catch (e) {
                    try {
                        sink.emitError(e);
                    } catch (e) {
                    }
                }
            }
            const collectedData: Array<T> = [];
            this.subscribe({
                onNext(data: T) {
                    collectedData.push(data);
                },
                onError(error: Error) {
                    soft(() => sink.emitError(error))
                },
                onComplete() {
                    soft(() => {
                        sink.emitData(collectedData);
                        try {
                            sink.emitClose()
                        } catch (e) {
                        }
                    })
                }
            })?.request(Number.MAX_SAFE_INTEGER)
        })
    }

    /**
     * Метод для объединения двух потоков данных в последовательность.
     * Потоки будут объединены так, что данные из второго потока начнут эмитироваться только после завершения первого.
     * Если первый поток завершится с ошибкой, второй поток не будет эмитировать свои данные.
     *
     * @param other - Второй поток данных, который будет эмитировать данные после завершения первого.
     * @returns Новый поток данных, который сначала эмитирует данные из текущего потока,
     * а затем — данные из второго потока.
     */
    public concatWith(other: PipePublisher<T>): Flux<T> {
        return this.pipe(sink => {
            return {
                onComplete() {
                    other.pipe(() => {
                        return {}
                    }, sink).subscribe()?.request(Number.MAX_SAFE_INTEGER)
                }
            }
        })
    }

    /**
     * Конкатенирует текущий поток данных с данными из предоставленного итератора.
     * Когда текущий поток завершится, элементы из итератора будут переданы в поток.
     *
     * @param other - Итерабельная коллекция данных, которые будут переданы после завершения текущего потока.
     * @returns Новый поток данных, который сначала эмитирует элементы текущего потока,
     * а затем элементы из предоставленного итератора.
     */
    public concatWithIterable(other: Iterable<T>): Flux<T> {
        return this.concatWith(Flux.fromIterable(other))
    }

    /**
     * Считывает все элементы потока и возвращает количество элементов.
     * Метод использует `collect()`, чтобы собрать все элементы потока в массив,
     * а затем использует метод `map`, чтобы вычислить длину этого массива.
     *
     * @returns Моно-объект, содержащий количество элементов в потоке.
     */
    public count(): Mono<number> {
        return this.collect().map(value => value.length)
    }

    /**
     * Задерживает эмиссию каждого элемента потока на указанное время.
     * Каждый элемент будет эмитироваться с задержкой, заданной параметром `duration`.
     *
     * @param duration - Время задержки в миллисекундах для каждого элемента потока.
     * @returns Новый поток, который эмитирует элементы с задержкой.
     */
    public delayElements(duration: number): Flux<T> {
        return this.pipe(sink => {
            let index = 0;
            let pending = 0;
            let isCompleted = false;
            return {
                onNext(data: T) {
                    pending++;
                    Schedulers.delay(++index * duration).schedule(() => {
                        sink.emitData(data);
                        if (--pending === 0 && isCompleted) {
                            sink.emitClose();
                        }
                    });
                },
                onComplete() {
                    isCompleted = true;
                    if (pending === 0) {
                        sink.emitClose();
                    }
                }
            }
        });
    }

    /**
     * Убирает дублирующиеся элементы из потока. Каждый элемент будет эмитироваться
     * только один раз, даже если он появляется несколько раз в потоке.
     *
     * Для отслеживания уникальности используется вспомогательная коллекция, где
     * сохраняются элементы, которые уже были эмитированы. Если элемент повторяется,
     * он будет пропущен.
     *
     * @returns Новый поток, который эмитирует только уникальные элементы, без дубликатов.
     */
    public distinct(): Flux<T> {
        return this.pipe(sink => {
            const seen = new Set<T>();
            return {
                onNext(data: T) {
                    if (!seen.has(data)) {
                        seen.add(data);
                        sink.emitData(data);
                    }
                }
            }
        });
    }

    /**
     *
     * Убирает повторяющиеся элементы, но только если они идут подряд.
     * Этот метод позволяет пропустить одинаковые элементы, только если они следуют подряд в потоке.
     * Например, если поток содержит элементы `[1, 1, 2, 2, 3]`, то результат будет `[1, 2, 3]`,
     * так как одинаковые элементы, которые идут друг за другом, будут исключены.
     *
     * @returns Новый поток, который эмитирует элементы, но пропускает идущие подряд повторения.
     */
    public distinctUntilChanged(): Flux<T> {
        return this.pipe(sink => {
            let lastEmitted: T | null = null
            return {
                onNext(data: T) {
                    if (lastEmitted != data) {
                        lastEmitted = data;
                        sink.emitData(data);
                    }
                }
            }
        });
    }

    /**
     * Группирует элементы потока по ключу, который извлекается с помощью функции-ключа.
     * Каждому уникальному ключу будет соответствовать массив, содержащий все элементы с этим ключом.
     * Когда поток завершится, будет эмитирован объект типа `Map<K, Array<T>>`, где `K` - тип ключа,
     * а `Array<T>` - массив всех элементов с этим ключом.
     *
     * @param keySelector - Функция, которая извлекает ключ для каждого элемента потока.
     * @returns Новый поток, который эмитирует объект `Map<K, Array<T>>`, где для каждого ключа будет список элементов.
     */
    public groupBy<K>(keySelector: (value: T) => K): Mono<Map<K, Array<T>>> {
        return this.pipe<Map<K, Array<T>>>(sink => {
            const groups = new Map<K, Array<T>>();
            return {
                onNext(data: T) {
                    const key = keySelector(data);
                    if (!groups.has(key)) groups.set(key, []);
                    groups.get(key)?.push(data);
                },
                onComplete() {
                    sink.emitData(groups)
                    sink.emitClose();
                }
            };
        }).first();
    }

    /**
     * Группирует элементы из текущего потока с элементами из другого потока на основе условия,
     * которое проверяет, должны ли два элемента быть объединены.
     *
     * todo не работает как надо. Дело в sink
     *
     * @param other - Поток, с которым мы хотим выполнить объединение.
     * @param joinCondition - Функция, которая возвращает `true`, если элементы из обоих потоков должны быть объединены.
     * @returns Новый поток, который эмитирует элементы, содержащие пары элементов из обоих потоков.
     */
    public groupJoin<R>(
        other: Flux<R>,
        joinCondition: (left: T, right: R) => boolean
    ): Flux<{ key: T, values: Array<R> }> {
        return this.pipe(sink => {
            return {
                onNext: (data: T) => {
                    other.filter(value => joinCondition(data, value))
                        .collect()
                        .subscribe({
                            onNext: (rightValues: Array<R>) => {
                                sink.emitData({key: data, values: rightValues});
                            },
                            onError: (error: Error) => {
                                sink.emitError(error);
                            },
                            onComplete: () => {
                                sink.emitClose();
                            }
                        });
                }
            }
        });
    }

    /**
     * Проверяет, существует ли хотя бы один элемент в потоке, который соответствует условию.
     * Этот метод завершит выполнение сразу после нахождения первого подходящего элемента.
     *
     * @param predicate - Функция, которая возвращает `true`, если элемент соответствует условию.
     * @returns Новый поток, который эмитирует `true`, если хотя бы один элемент соответствует условию, и `false` в противном случае.
     */
    public hasElement(predicate: (value: T) => boolean): Mono<boolean> {
        return new Mono<boolean>(sink =>
            this.filter(predicate).pipe(other => () => other.emitData(true), sink)
                .subscribe()
                .request(1)
        ).switchIfEmpty(Mono.just(false));
    }

    /**
     * Проверяет, существует ли хотя бы один элемент в потоке
     * Этот метод завершит выполнение сразу после нахождения первого подходящего элемента.
     *
     * @returns Новый поток, который эмитирует `true`, если хотя бы один элемент находится в потоке.
     */
    public hasElements(): Mono<boolean> {
        return this.hasElement(() => true)
    }

    /**
     * Добавляет порядковый номер каждому элементу потока.
     * Элементы потока будут представлены как объекты с двумя свойствами:
     * - `index` - порядковый номер элемента в потоке
     * - `value` - сам элемент потока
     *
     * @returns Новый поток, который эмитирует объекты с индексом и значением каждого элемента.
     */
    public indexed(): Flux<{ index: number, value: T }> {
        return this.pipe(sink => {
            let index = 0;
            return {
                onNext(data: T) {
                    sink.emitData({index: index++, value: data});
                }
            }
        })
    }

    /**
     * Осуществляет соединение элементов текущего потока с элементами другого потока.
     * Каждый элемент текущего потока будет объединен с элементом из второго потока.
     *
     * @param other - Второй поток, с которым нужно выполнить соединение.
     * @returns Новый поток, который эмитирует объекты с объединенными данными из обоих потоков.
     */
    public join<U>(other: Flux<U>): Flux<{ left: T, right: U }> {
        return this.flatMap(left => other.map(right => ({left, right})));
    }

    /**
     * Возвращает последний элемент из потока.
     * Если поток пуст, то будет эмитирована ошибка.
     *
     * @returns Новый поток, который эмитирует последний элемент из исходного потока.
     */
    public last(): Mono<T> {
        return new Mono<T>(sink => {
            let lastValue: T | undefined;
            this.pipe(other => {
                return {
                    onNext(data: T) {
                        lastValue = data;
                    },
                    onComplete() {
                        other.emitData(lastValue)
                        try {
                            other.emitClose()
                        } catch (e) {
                        }
                    }
                }
            }, sink).subscribe()?.request(Number.MAX_SAFE_INTEGER)
        });
    }

    /**
     * Объединяет два потока, эмиттируя элементы из обоих потоков по мере их поступления.
     * Элементы из потоков могут быть обработаны параллельно, без гарантии порядка.
     *
     * @param other - Второй поток, который будет объединён с текущим.
     * @returns Новый поток, который будет эмиттировать элементы из обоих потоков.
     */
    public mergeWith(other: PipePublisher<T>): Flux<T> {
        return this.pipe((sink, count) => {
            let countDown = 2;
            const onComplete = () => {
                if (--countDown < 1) {
                    sink.emitClose()
                }
            }
            other.pipe(() => {
                return {
                    onComplete
                }
            }, sink).subscribe()?.request(count)
            return {
                onComplete
            }
        })
    }

    /**
     * Применяет аккумуляторную функцию к каждому элементу потока, накапливая одно итоговое значение.
     * Этот метод эмиттирует итоговый результат после обработки всех элементов потока.
     *
     * @param accumulator - Функция, которая принимает накопленное значение и текущий элемент, и возвращает обновлённое накопленное значение.
     * @param initial - Начальное значение для аккумулятора.
     * @returns Новый поток, который эмиттирует единственное итоговое значение после обработки всех элементов потока.
     */
    public reduce<U>(accumulator: (acc: U, value: T) => U, initial: U): Mono<U> {
        return new Mono<U>(sink => {
            let accumulatorValue = initial;
            this.subscribe({
                onNext(data: T) {
                    accumulatorValue = accumulator(accumulatorValue, data); // Применяем аккумуляторную функцию
                },
                onError(error: Error) {
                    sink.emitError(error);
                },
                onComplete() {
                    sink.emitData(accumulatorValue);
                    try {
                        sink.emitClose();
                    } catch (e) {
                    }
                }
            })?.request(Number.MAX_SAFE_INTEGER);
        }).map(value => value);
    }

    /**
     * Применяет аккумуляторную функцию к каждому элементу потока, начиная с начального значения, которое генерируется функцией.
     * Это позволяет динамически вычислять начальное значение.
     *
     * @param accumulator - Функция, которая принимает накопленное значение и текущий элемент, и возвращает обновлённое накопленное значение.
     * @param supplier - Функция, которая генерирует начальное значение для аккумулятора.
     * @returns Новый поток, который эмиттирует итоговое значение после обработки всех элементов потока.
     */
    public reduceWith<U>(accumulator: (acc: U, value: T) => U, supplier: () => U): Mono<U> {
        return new Mono<U>(sink => {
            try {
                this.reduce(accumulator, supplier())
                    .pipe(() => {
                        return {}
                    }, sink).subscribe()
            } catch (e) {
                sink.emitError(e)
            }
        });
    }

    /**
     * Пропускает первые `n` элементов потока.
     *
     * @param n - Количество элементов, которые нужно пропустить.
     * @returns Новый поток, который пропускает первые `n` элементов и эмитирует оставшиеся.
     */
    public skip(n: number): Flux<T> {
        return this.pipe(sink => {
            let skipped = 0;
            return {
                onNext(data: T) {
                    if (skipped++ < n) return;
                    sink.emitData(data);
                }
            };
        });
    }

    /**
     * Пропускает последние `n` элементов потока.
     *
     * @param n - Количество элементов, которые нужно пропустить с конца.
     * @returns Новый поток, который пропускает последние `n` элементов и эмитирует остальные.
     */
    public skipLast(n: number): Flux<T> {
        return this.pipe(sink => {
            const buffer: T[] = [];
            return {
                onNext(data: T) {
                    buffer.push(data);
                    if (buffer.length > n) {
                        sink.emitData(buffer.shift()!);
                    }
                }
            };
        });
    }

    /**
     * Пропускает элементы потока до тех пор, пока другой поток не эмитирует элемент.
     *
     * @param other - Другой поток, который определяет, когда следует начать эмитировать элементы.
     * @returns Новый поток, который начинает эмитировать элементы, когда другой поток эмитирует хотя бы один элемент.
     */
    public skipUntil(other: PipePublisher<any>): Flux<T> {
        return this.pipe(sink => {
            let skip = true;
            other.subscribe({
                onNext() {
                    skip = false;
                }
            })?.request(Number.MAX_SAFE_INTEGER);
            return {
                onNext(data: T) {
                    if (skip) return;
                    sink.emitData(data);
                }
            };
        });
    }

    /**
     * Пропускает элементы потока до тех пор, пока другой поток не завершится.
     *
     * @param other - Другой поток, который определяет, когда нужно начать эмитировать элементы.
     * @returns Новый поток, который начинает эмитировать элементы, когда другой поток завершится.
     */
    public skipUntilOther(other: PipePublisher<any>): Flux<T> {
        return this.pipe(sink => {
            let skip = true;
            other.subscribe({
                onComplete() {
                    skip = false;
                }
            })?.request(Number.MAX_SAFE_INTEGER);
            return {
                onNext(data: T) {
                    if (skip) return;
                    sink.emitData(data);
                }
            };
        });
    }

    /**
     * Пропускает элементы, пока предикат возвращает `true`.
     * Как только предикат возвращает `false`, поток начинает эмитировать элементы.
     *
     * @param predicate - Функция, которая проверяет условие для каждого элемента.
     * @returns Новый поток, который пропускает элементы до тех пор, пока условие не станет ложным.
     */
    public skipWhile(predicate: (value: T) => boolean): Flux<T> {
        return this.pipe(sink => {
            let skipping = true;
            return {
                onNext(data: T) {
                    if (skipping && predicate(data)) return;
                    skipping = false;
                    sink.emitData(data);
                }
            };
        });
    }

    /**
     * Возвращает новый поток, который эмитирует данные из переданного потока, как только текущий поток завершится.
     *
     * @param other - Поток, данные из которого будут эмитироваться после завершения текущего потока.
     * @returns Новый поток, который сначала эмитирует данные текущего потока, а затем данные из переданного потока.
     */
    public then(other: PipePublisher<T>): Flux<T> {
        return this.pipe(sink => {
            return {
                onComplete() {
                    other.pipe(() => {
                        return {}
                    }, sink).subscribe()?.request(Number.MAX_SAFE_INTEGER)
                }
            }
        });
    }

    /**
     * Возвращает новый поток, который завершится, как только текущий поток завершится, не эмитируя никаких данных.
     *
     * @returns Поток, который завершится, как только текущий поток завершится, но не будет эмитировать данных.
     */
    public thenEmpty(): Flux<T> {
        return this.then(Flux.empty())
    }
}