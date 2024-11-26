import Subscriber from "@/subscriber/Subscriber";
import Subscription from "@/subscription/Subscription";
import Sinks, {Sink} from "sinks";
import PipePublisher from "@/publisher/PipePublisher";
import Schedulers, {Scheduler} from "schedulers";
import CorePublisher from "@/publisher/CorePublisher";
import Flux from "@/publisher/flux/Flux";

/**
 * Mono — это класс, который представляет собой Publisher, эмитирующий 0 или 1 элемент.
 * Он предоставляет методы для работы с асинхронными данными, включая обработку ошибок,
 * выполнения дополнительных действий и манипуляций с элементами потока.
 */
export default class Mono<T> extends CorePublisher<T> {
    constructor(producer: (sink: Sink<T>, count: number) => void) {
        super(producer);
    }

    /**
     * Применяет операцию (оператор) к текущему потоку и возвращает новый Mono с результатами.
     *
     * @param operation - Функция для обработки каждого элемента в потоке.
     * @param transit - Опциональная дополнительная "поглотительная" середина для передачи данных.
     * @param scheduler - Опциональный планировщик, который определяет, когда выполняется операция.
     * @returns Новый Mono с результатами применения операции.
     */
    public pipe<U>(operation: (sink: Sink<U>, count: number) => (((data: T) => void) | Subscriber<T>), transit?: Sink<U>, scheduler: Scheduler = Schedulers.immediate()): Mono<U> {
        return super.pipe(operation, transit, scheduler) as Mono<U>;
    }

    /**
     * Применяет маппер (преобразователь) к каждому элементу потока.
     *
     * @param mapper - Функция, которая преобразует элемент потока.
     * @returns Новый Mono с преобразованными элементами.
     */
    public map<U>(mapper: (value: T) => U): Mono<U> {
        return super.map(mapper) as Mono<U>;
    }

    /**
     * Применяет маппер, но пропускает элементы, которые не возвращают значения (null или undefined).
     *
     * @param mapper - Функция, которая преобразует элемент потока.
     * @returns Новый Mono с преобразованными элементами, исключая пустые.
     */
    public mapNotNull<U>(mapper: (value: T) => U): Mono<U> {
        return super.mapNotNull(mapper) as Mono<U>;
    }

    /**
     * Выполняет действие до начала эмиссии потока.
     *
     * @param action - Функция, которая выполняется перед эмиссией.
     * @returns Новый Mono с действием до эмиссии.
     */
    public doFirst(action: () => void): Mono<T> {
        return super.doFirst(action) as Mono<T>;
    }

    /**
     * Выполняет действие при эмиссии каждого элемента.
     *
     * @param action - Функция, которая выполняется на каждом элементе.
     * @returns Новый Mono с действием при эмиссии.
     */
    public doOnNext(action: (value: T) => void): Mono<T> {
        return super.doOnNext(action) as Mono<T>;
    }

    /**
     * Выполняет действие при завершении потока (в том числе при ошибке).
     *
     * @param action - Функция, которая выполняется после завершения.
     * @returns Новый Mono с действием при завершении.
     */
    public doFinally(action: () => void): Mono<T> {
        return super.doFinally(action) as Mono<T>;
    }

    /**
     * Применяет преобразование для каждого элемента, которое может создать новый Mono.
     *
     * @param mapper - Функция, которая возвращает новый Mono для каждого элемента.
     * @returns Новый Mono с результатами обработки каждого элемента.
     */
    public flatMap<U>(mapper: (value: T) => Mono<U>): Mono<U> {
        return this.pipe(sink => {
            return {
                onNext(data: T) {
                    mapper(data)
                        .pipe(() => {
                            return {}
                        }, sink)
                        .subscribe()
                }
            }
        })
    }

    /**
     * Преобразует элемент текущего потока в новый поток Flux.
     *
     * @param mapper - Функция, которая для элемента текущего потока возвращает новый поток (Flux<U>).
     * @returns Новый поток (Flux<U>), который комбинирует все элементы из потоков, созданных для каждого элемента исходного потока.
     */
    public flatMapMany<U>(mapper: (value: T) => Flux<U>): Flux<U> {
        return new Flux(sink => {
            this.subscribe({
                onNext(data: T) {
                    mapper(data).pipe(() => {
                        return {}
                    }, sink).subscribe()?.request(Number.MAX_SAFE_INTEGER)
                },
                onError(error: Error) {
                    sink.emitError(error)
                },
                onComplete() {
                    sink.emitClose()
                }
            })
        })
    }

    /**
     * Возвращает Mono, которое продолжает выполнение потока, если произошла ошибка.
     *
     * @param alternate - Альтернативный поток, который будет использоваться в случае ошибки.
     * @returns Новый Mono, которое обработает ошибку и продолжит выполнение.
     */
    public onErrorReturn(alternate: PipePublisher<T>): Mono<T> {
        return super.onErrorReturn(alternate) as Mono<T>;
    }

    /**
     * Переносит выполнение операций на указанный планировщик.
     *
     * @param scheduler - Планировщик для выполнения операций.
     * @returns Новый Mono, которое выполняется на указанном планировщике.
     */
    public publishOn(scheduler: Scheduler): Mono<T> {
        return super.publishOn(scheduler) as Mono<T>;
    }

    /**
     * Переносит выполнение операций на указанный планировщик.
     *
     * @param scheduler - Планировщик для выполнения операций.
     * @returns Новый Mono, которое подписывается на указанный планировщик.
     */
    public subscribeOn(scheduler: Scheduler): Mono<T> {
        return super.subscribeOn(scheduler) as Mono<T>;
    }

    /**
     * Задает таймаут для потока. Если поток не завершится в заданный период времени, будет выброшена ошибка.
     *
     * @param duration - Время в миллисекундах, по истечении которого поток завершится с ошибкой.
     * @returns Новый Mono с таймаутом.
     */
    public timeout(duration: number): Mono<T> {
        return super.timeout(duration) as Mono<T>;
    }

    /**
     * Создает Mono с одним значением.
     *
     * @param value - Значение, которое будет эмитировано потоком.
     * @returns Новый Mono с одним значением.
     */
    public static just<T>(value: T): Mono<T> {
        return new Mono((sink) => sink.emitData(value));
    }

    /**
     * Создает Mono с одним значением или с пустым потоком, если значение null.
     *
     * @param value - Значение, которое будет эмитировано потоком.
     * @returns Новый Mono с одним значением или пустым потоком.
     */
    public static justOrEmpty<T>(value: T): Mono<T> {
        return value == null ? Mono.empty() : Mono.just(value);
    }

    /**
     * Создает Mono, которое эмитирует ошибку.
     *
     * @param error - Ошибка, которая будет эмитирована потоком.
     * @returns Новый Mono с ошибкой.
     */
    public static error<T>(error: Error): Mono<T> {
        return new Mono<T>((sink) => sink.emitError(error));
    }

    /**
     * Создает пустой Mono, который сразу завершится.
     *
     * @returns Новый Mono с завершением.
     */
    public static empty<T>(): Mono<T> {
        return new Mono(sink => sink.emitClose());
    }

    /**
     * Создает Mono, которое эмитирует результат из промиса.
     *
     * @param promise - Промис, результат которого будет эмитирован.
     * @returns Новый Mono, который эмитирует результат промиса.
     */
    public static fromPromise<T>(promise: Promise<T>): Mono<T> {
        return new Mono<T>((sink) => promise
            .then((value) => sink.emitData(value))
            .catch((error) => sink.emitError(error))
        );
    }

    /**
     * Создает Mono, которое будет создано только когда оно будет подписано.
     *
     * @param producer - Функция, которая создает Mono, когда подписка активируется.
     * @returns Новый Mono, которое будет создано на основе переданной функции.
     */
    public static defer<T>(producer: () => Mono<T>): Mono<T> {
        return new Mono<T>((sink) => {
            producer().pipe(() => {
                return {}
            }, sink).subscribe()
        });
    }

    /**
     * Создает новый Sink для обработки потока.
     *
     * @returns Новый Sink для обработки потока.
     */
    protected createSink(): Sink<T> {
        return Sinks.one()
    }

    /**
     * Преобразует Mono в другой тип.
     *
     * @returns Новый Mono с другим типом.
     */
    public cast<U>(): Mono<U> {
        return this as unknown as Mono<U>
    }

    /**
     * Фильтрует элементы потока по заданному предикату.
     *
     * @param predicate - Функция, которая проверяет каждый элемент потока.
     * @returns Новый Mono, которое фильтрует элементы потока.
     */
    public filter(predicate: (value: T) => boolean): Mono<T> {
        return this.pipe(sink => data => predicate(data) ? sink.emitData(data) : sink.emitClose())
    }

    /**
     * Фильтрует элементы потока на основе результата другого Mono.
     *
     * @param predicate - Функция, которая возвращает Mono с результатом фильтрации.
     * @returns Новый Mono, которое фильтрует элементы потока по результатам другого Mono.
     */
    public filterWhen(predicate: (value: T) => Mono<boolean>): Mono<T> {
        return super.filterWhen(predicate) as Mono<T>
    }

    /**
     * Возвращает поток, который продолжает выполнение после ошибки.
     *
     * @returns Новый Mono, которое продолжает выполнение после ошибки.
     */
    public onErrorContinue(): Mono<T> {
        return this.onErrorReturn(Mono.empty())
    }

    /**
     * Если поток пустой, заменяет его альтернативным потоком.
     *
     * @param alternate - Альтернативный поток, который будет использоваться, если основной поток пустой.
     * @returns Новый Mono, которое будет эмитировать данные из альтернативного потока.
     */
    public switchIfEmpty(alternate: Mono<T>): Mono<T> {
        return super.switchIfEmpty(alternate) as Mono<T>
    }

    /**
     * Выполняет операцию zip с другим Mono, комбинируя значения с помощью комбинирующей функции.
     *
     * @param other - Второй Mono, с которым будет произведен zip.
     * @param combiner - Функция, которая комбинирует два элемента в одно значение.
     * @returns Новый Mono, которое содержит комбинированное значение.
     */
    public zipWith<T2, R>(other: Mono<T2>, combiner: (value1: T, value2: T2) => R): Mono<R> {
        return this.zipWhen(() => other, combiner);
    }

    /**
     * Выполняет операцию zip с другим Mono, комбинируя значения с помощью комбинирующей функции.
     *
     * @param fn - Функция, которая возвращает другой Mono для zip.
     * @param combiner - Функция, которая комбинирует два элемента в одно значение.
     * @returns Новый Mono, которое содержит комбинированное значение.
     */
    public zipWhen<T2, R>(fn: (value: T) => Mono<T2>, combiner: (value1: T, value2: T2) => R): Mono<R> {
        return this.flatMap(value => fn(value)
            .map(other => combiner(value, other)))
    }

    /**
     * Проверяет, содержит ли поток хотя бы один элемент.
     *
     * @returns Новый Mono, которое эмитирует true, если поток содержит хотя бы один элемент.
     */
    public hasElement(): Mono<boolean> {
        return this.map(() => true).switchIfEmpty(Mono.just(false));
    }

    /**
     * Преобразует поток в промис.
     *
     * @returns Промис, который будет резолвиться или реджектиться в зависимости от потока.
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
     * Подписывается на поток.
     *
     * @param subscriber - Функция или подписчик для обработки данных потока.
     */
    public subscribe(subscriber?: ((data: T) => void) | Subscriber<T>): void {
        (super.subscribe(subscriber) as Subscription).request(1);
    }
}