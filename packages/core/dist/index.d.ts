/**
 * Подписчик на поток значений.
 */
interface Subscriber<T> {
    onNext(value: T): void;
    onError(error: Error): void;
    onComplete(): void;
}
/**
 * Контролирует подписку: запрос значений и отписка.
 */
interface Subscription {
    request(count: number): void;
    unsubscribe(): void;
}

/**
 * Источник данных — может быть подписан подписчиком.
 */
interface Publisher<T> {
    subscribe(subscriber: Subscriber<T>): Subscription;
}
declare class BackpressurePublisher<T> implements Publisher<T> {
    private backpressure;
    private subscriber?;
    private requested;
    private subscription;
    constructor(sink: Publisher<T>);
    private emit;
    private flush;
    subscribe(subscriber: Subscriber<T>): Subscription;
}

/**
 * Активный отправитель значений.
 */
interface Sink<T> {
    next(value: T): void;
    error(error: Error): void;
    complete(): void;
}

type Backpressure<T> = {
    subscriber: Subscriber<T>;
    data: EmitAction<T>[];
    requested: number;
};
type EmitAction<T> = {
    emit: 'next' | 'error' | 'complete';
    data?: T | Error;
};
declare abstract class BackpressureSink<T> implements Sink<T>, Publisher<T> {
    protected readonly subscribers: Set<Backpressure<T>>;
    protected completed: boolean;
    protected emit(action: EmitAction<T>, subscriber: Subscriber<T>): void;
    private flush;
    subscribe(subscriber: Subscriber<T>): Subscription;
    protected validateEmit(): void;
    next(value: T): void;
    error(error: Error): void;
    complete(): void;
}

declare class ManySink<T> extends BackpressureSink<T> {
}

declare abstract class ReplaySink<T> extends ManySink<T> implements BackpressureSink<T> {
    readonly buffer: EmitAction<T>[];
    protected replay(subscriber: Subscriber<T>): void;
    protected store(emit: 'next' | 'error' | 'complete', data?: T | Error): void;
    next(value: T): void;
    error(error: Error): void;
    complete(): void;
    subscribe(subscriber: Subscriber<T>): Subscription;
}

declare class ReplayAllSink<T> extends ReplaySink<T> {
}

declare class ReplayLimitSink<T> extends ReplaySink<T> {
    private readonly limit;
    constructor(limit: number);
    protected store(emit: "next" | "error" | "complete", data?: Error | T): void;
}

declare class ReplayLatestSink<T> extends ReplaySink<T> {
    private readonly limit;
    constructor(limit: number);
    protected store(emit: "next" | "error" | "complete", data?: Error | T): void;
}

declare class OneSink<T> extends BackpressureSink<T> {
    subscribe(subscriber: Subscriber<T>): Subscription;
    next(value: T): void;
    error(error: Error): void;
}

/**
 * Интерфейс планировщика задач.
 * Используется для контроля исполнения реактивных операций.
 */
interface Scheduler {
    /**
     * Планирует задачу на выполнение.
     * @param task функция, вызываемая планировщиком
     */
    schedule(task: () => void): void;
}
/**
 * Расширенный Scheduler с возможностью отмены.
 */
interface CancellableScheduler extends Scheduler {
    /**
     * Планирует задачу с возможностью отмены.
     * @param task задача
     * @returns объект cancel
     */
    schedule(task: () => void): {
        cancel: () => void;
    };
}

/**
 * Немедленно исполняющий планировщик (синхронно).
 */
declare class ImmediateScheduler implements Scheduler {
    schedule(task: () => void): void;
}

/**
 * Планировщик, использующий очередь microtasks (Promise).
 */
declare class MicroScheduler implements Scheduler {
    schedule(task: () => void): void;
}

/**
 * Планировщик, использующий macro tasks (через setTimeout).
 */
declare class MacroScheduler implements Scheduler {
    schedule(task: () => void): void;
}

/**
 * Планировщик с задержкой выполнения задачи и возможностью отмены.
 */
declare class DelayScheduler implements CancellableScheduler {
    private readonly delay;
    constructor(delay: number);
    schedule(task: () => void): {
        cancel: () => void;
    };
}

/**
 * Publisher с возможностью построения реактивных цепочек операторов.
 */
interface PipePublisher<T> extends Publisher<T> {
    /**
     * Объединяет несколько операторов в цепочку.
     */
    pipe<R>(producer: (onNext: (value: R) => void, onError: (error: Error) => void, onComplete: () => void) => void, onSubscribe: (subscriber: Subscriber<R>) => void, onRequest: (request: number) => void, onUnsubscribe: () => void): PipePublisher<R>;
    /**
     * Преобразует входящее значение.
     */
    map<R>(fn: (value: T) => R): PipePublisher<R>;
    /**
     * Преобразует значение, отбрасывает null/undefined.
     */
    mapNotNull<R>(fn: (value: T) => R | null | undefined): PipePublisher<R>;
    /**
     * Раскрывает новый Publisher для каждого значения.
     */
    flatMap<R>(fn: (value: T) => Publisher<R>): PipePublisher<R>;
    /**
     * Пропускает значения, не прошедшие фильтр.
     */
    filter(predicate: (value: T) => boolean): PipePublisher<T>;
    /**
     * Асинхронный фильтр.
     */
    filterWhen(predicate: (value: T) => Publisher<boolean>): PipePublisher<T>;
    /**
     * Приведение типа.
     */
    cast<R>(): PipePublisher<R>;
    /**
     * Использует альтернативный Publisher, если исходный пуст.
     */
    switchIfEmpty(alternative: Publisher<T>): PipePublisher<T>;
    /**
     * Возвращает значение по умолчанию при ошибке.
     */
    onErrorReturn(replacement: Publisher<T>): PipePublisher<T>;
    /**
     * Игнорирует ошибку и вызывает обработчик.
     */
    onErrorContinue(predicate: (error: Error) => boolean): PipePublisher<T>;
    /**
     * Выполняет побочный эффект сразу при создании цепочки.
     */
    doFirst(fn: () => void): PipePublisher<T>;
    /**
     * Выполняет побочный эффект при каждом onNext.
     */
    doOnNext(fn: (value: T) => void): PipePublisher<T>;
    /**
     * Выполняет побочный эффект при завершении или ошибке.
     */
    doFinally(fn: () => void): PipePublisher<T>;
    /**
     * Вызывается при подписке, позволяет манипулировать request().
     */
    doOnSubscribe(fn: (subscriber: Subscriber<T>) => void): PipePublisher<T>;
    /**
     * Переносит выполнение onNext/onError/onComplete в указанный Scheduler.
     */
    publishOn(scheduler: Scheduler): PipePublisher<T>;
    /**
     * Осуществляет подписку в указанном Scheduler.
     */
    subscribeOn(scheduler: Scheduler): PipePublisher<T>;
}
declare abstract class AbstractPipePublisher<T> implements PipePublisher<T> {
    protected readonly publisher: Publisher<T>;
    abstract subscribe(subscriber: Subscriber<T>): Subscription;
    abstract sinkType(): 'one' | 'many';
    protected constructor(publisher: Publisher<T>);
    private wrap;
    pipe<R>(producer: (onNext: (value: R) => void, onError: (error: Error) => void, onComplete: () => void) => void, onSubscribe?: (subscriber: Subscriber<R>) => void, onRequest?: (request: number) => void, onUnsubscribe?: () => void): PipePublisher<R>;
    map<R>(fn: (value: T) => R): PipePublisher<R>;
    mapNotNull<R>(fn: (value: T) => R | null | undefined): PipePublisher<R>;
    flatMap<R>(fn: (value: T) => Publisher<R>): PipePublisher<R>;
    filter(predicate: (value: T) => boolean): PipePublisher<T>;
    filterWhen(predicate: (value: T) => Publisher<boolean>): PipePublisher<T>;
    cast<R>(): PipePublisher<R>;
    switchIfEmpty(alternative: Publisher<T>): PipePublisher<T>;
    onErrorReturn(replacement: Publisher<T>): PipePublisher<T>;
    onErrorContinue(predicate: (error: Error) => boolean): PipePublisher<T>;
    doFirst(fn: () => void): PipePublisher<T>;
    doOnNext(fn: (value: T) => void): PipePublisher<T>;
    doFinally(fn: () => void): PipePublisher<T>;
    doOnSubscribe(fn: (subscriber: Subscriber<T>) => void): PipePublisher<T>;
    publishOn(scheduler: Scheduler): PipePublisher<T>;
    subscribeOn(scheduler: Scheduler): PipePublisher<T>;
}

declare class Flux<T> extends AbstractPipePublisher<T> {
    protected constructor(publisher: Publisher<T>);
    sinkType(): 'one' | 'many';
    /**
     * Возвращает первый элемент потока как Mono.
     */
    first(): Mono<T>;
    /**
     * Возвращает последний элемент потока как Mono.
     */
    last(): Mono<T>;
    /**
     * Возвращает количество элементов в потоке.
     */
    count(): Mono<number>;
    /**
     * Проверяет наличие хотя бы одного элемента.
     */
    hasElements(): Mono<boolean>;
    /**
     * Собирает все элементы в массив и возвращает как Mono<T[]>.
     */
    collect(force?: boolean): Mono<T[]>;
    /**
     * Индексирует элементы потока: [index, value].
     */
    indexed(): Flux<[number, T]>;
    skip(n: number): Flux<T>;
    skipWhile(predicate: (value: T) => boolean): Flux<T>;
    skipUntil(other: Publisher<any>): Flux<T>;
    distinct(): Flux<T>;
    distinctUntilChanged(deep?: boolean): Flux<T>;
    delayElements(ms: number): Flux<T>;
    concatWith(other: Publisher<T>): Flux<T>;
    mergeWith(other: Publisher<T>): Flux<T>;
    reduce(reducer: (acc: T, next: T) => T): Mono<T>;
    reduceWith<A>(seedFactory: () => A, reducer: (acc: A, next: T) => A): Mono<A>;
    then(): Mono<void>;
    thenEmpty(other: Publisher<any>): Mono<void>;
    static from<T>(publisher: Publisher<T>): Flux<T>;
    static generate<T>(generator: ((sink: Sink<T>) => void)): Flux<T>;
    static fromIterable<T>(iterable: Iterable<T>): Flux<T>;
    static range(start: number, count: number): Flux<number>;
    static empty<T = never>(): Flux<T>;
    static defer<T>(factory: () => Flux<T>): Flux<T>;
    subscribe({ onNext, onError, onComplete }?: {
        onNext?: ((value: T) => void) | undefined;
        onError?: ((error: Error) => void) | undefined;
        onComplete?: (() => void) | undefined;
    }): Subscription;
    pipe<R>(producer: (onNext: (value: R) => void, onError: (error: Error) => void, onComplete: () => void) => void, onSubscribe?: (subscriber: Subscriber<R>) => void, onRequest?: (request: number) => void, onUnsubscribe?: () => void): Flux<R>;
    map<R>(fn: (value: T) => R): Flux<R>;
    mapNotNull<R>(fn: (value: T) => (R | null | undefined)): Flux<R>;
    flatMap<R>(fn: (value: T) => Publisher<R>): Flux<R>;
    filter(predicate: (value: T) => boolean): Flux<T>;
    filterWhen(predicate: (value: T) => Publisher<boolean>): Flux<T>;
    cast<R>(): Flux<R>;
    switchIfEmpty(alternative: Publisher<T>): Flux<T>;
    onErrorReturn(replacement: Publisher<T>): Flux<T>;
    onErrorContinue(predicate: (error: Error) => boolean): Flux<T>;
    doFirst(fn: () => void): Flux<T>;
    doOnNext(fn: (value: T) => void): Flux<T>;
    doFinally(fn: () => void): Flux<T>;
    doOnSubscribe(fn: (subscriber: Subscriber<T>) => void): Flux<T>;
    publishOn(scheduler: Scheduler): Flux<T>;
    subscribeOn(scheduler: Scheduler): Flux<T>;
}

/**
 * Реактивный Publisher, испускающий максимум одно значение или завершение.
 */
declare class Mono<T> extends AbstractPipePublisher<T> {
    protected constructor(publisher: Publisher<T>);
    /**
     * Подписывает подписчика на обёрнутый Publisher.
     */
    subscribe({ onNext, onError, onComplete }?: {
        onNext?: ((value: T) => void) | undefined;
        onError?: ((error: Error) => void) | undefined;
        onComplete?: (() => void) | undefined;
    }): Subscription;
    sinkType(): 'one' | 'many';
    static from<T>(publisher: Publisher<T>): Mono<T>;
    static generate<T>(generator: ((sink: Sink<T>) => void)): Mono<T>;
    /**
     * Возвращает Mono, испускающий одно значение и завершающийся.
     *
     * @example
     * Mono.just(42).subscribe(...)
     */
    static just<T>(value: T): Mono<T>;
    /**
     * Возвращает пустой Mono (только onComplete).
     *
     * @example
     * Mono.empty().subscribe(...)
     */
    static empty<T = never>(): Mono<T>;
    /**
     * Возвращает Mono, испускающий только ошибку.
     *
     * @example
     * Mono.error(new Error("Oops")).subscribe(...)
     */
    static error<T = never>(error: any): Mono<T>;
    /**
     * Возвращает Mono.just(value), если value != null, иначе Mono.empty().
     *
     * @example
     * Mono.justOrEmpty(null) → Mono.empty()
     */
    static justOrEmpty<T>(value: T | null | undefined): Mono<T>;
    /**
     * Преобразует Promise в Mono.
     *
     * - resolve → onNext(value), onComplete
     * - reject → onError(error)
     *
     * @example
     * Mono.fromPromise(fetch(...)).subscribe(...)
     */
    static fromPromise<T>(promise: Promise<T>): Mono<T>;
    /**
     * Создаёт Mono, который инициализируется лениво при подписке.
     *
     * @example
     * Mono.defer(() => Mono.just(Date.now()))
     */
    static defer<T>(factory: () => Mono<T>): Mono<T>;
    /**
     * Преобразует Mono<T> в Flux<R> через маппер.
     */
    flatMapMany<R>(mapper: (value: T) => Publisher<R>): Flux<R>;
    /**
     * Объединяет два Mono в Mono<[T, R]>.
     */
    zipWith<R>(other: Mono<R>): Mono<[T, R]>;
    /**
     * Комбинирует Mono<T> с результатом fn(value): Mono<R>.
     */
    zipWhen<R>(fn: (value: T) => Mono<R>): Mono<[T, R]>;
    /**
     * Проверяет, содержит ли Mono значение.
     */
    hasElement(): Mono<boolean>;
    /**
     * Преобразует Mono<T> в Promise<T | null>.
     */
    toPromise(): Promise<T | null>;
    pipe<R>(producer: (onNext: (value: R) => void, onError: (error: Error) => void, onComplete: () => void) => void, onSubscribe?: (subscriber: Subscriber<R>) => void, onRequest?: (request: number) => void, onUnsubscribe?: () => void): Mono<R>;
    map<R>(fn: (value: T) => R): Mono<R>;
    mapNotNull<R>(fn: (value: T) => (R | null | undefined)): Mono<R>;
    flatMap<R>(fn: (value: T) => Publisher<R>): Mono<R>;
    filter(predicate: (value: T) => boolean): Mono<T>;
    filterWhen(predicate: (value: T) => Publisher<boolean>): Mono<T>;
    cast<R>(): Mono<R>;
    switchIfEmpty(alternative: Publisher<T>): Mono<T>;
    onErrorReturn(replacement: Publisher<T>): Mono<T>;
    onErrorContinue(predicate: (error: Error) => boolean): Mono<T>;
    doFirst(fn: () => void): Mono<T>;
    doOnNext(fn: (value: T) => void): Mono<T>;
    doFinally(fn: () => void): Mono<T>;
    doOnSubscribe(fn: (subscriber: Subscriber<T>) => void): Mono<T>;
    publishOn(scheduler: Scheduler): Mono<T>;
    subscribeOn(scheduler: Scheduler): Mono<T>;
}

interface Deserializer<B, A> {
    deserialize<C extends B>(obj: A): C;
}
interface Serializer<B, A> extends Deserializer<B, A> {
    serialize(obj: B): A;
}

declare const _default$6: Serializer<string, string>;

declare const _default$5: Serializer<any, Uint8Array<ArrayBuffer>>;

declare const _default$4: Serializer<any, string>;

declare const _default$3: Serializer<any, string>;

declare const _default$2: {
    serialize(data: string, secret?: string): string;
    deserialize<C extends string>(data: string, secret?: string): C;
};

type StorageType = 'memory' | 'local' | 'session';
type RemoveReason = 'manual' | 'expire' | 'eviction';
type OverflowPolicy = 'overwrite' | 'ignore' | 'error';
interface CacheOptions<K, V> {
    name?: string;
    encode: boolean;
    storage: StorageType;
    maxSize: number;
    overflowPolicy: OverflowPolicy;
    expireAfterAccess: number;
    expireAfterWrite: number;
    onRemove?: (key: K, value: V, reason: RemoveReason) => void;
}
declare class CacheBuilder<K, V> {
    private _name?;
    private _encode;
    private _storage;
    private _maxSize;
    private _overflowPolicy;
    private _expireAfterAccess;
    private _expireAfterWrite;
    private _onRemove?;
    name(value: string): this;
    encode(value: boolean): this;
    storage(value: StorageType): this;
    maxSize(value: number): this;
    overflowPolicy(value: OverflowPolicy): this;
    expireAfterAccess(value: number): this;
    expireAfterWrite(value: number): this;
    onRemove(value: (key: K, value: V, reason: RemoveReason) => void): this;
    private buildOptions;
    build(): Cache<K, V>;
}
declare class Cache<K, V> {
    protected readonly options: CacheOptions<K, V>;
    private readonly cache;
    constructor(options: CacheOptions<K, V>);
    private initialize;
    save(): void;
    get(key: K, factory: (key: K) => V): V;
    getIfPresent(key: K): V | null;
    put(key: K, value: V): V;
    invalidate(key?: K, reason?: RemoveReason): void;
    invalidateAll(): void;
}
declare const _default$1: {
    builder: <K, V>() => CacheBuilder<K, V>;
};

declare enum EventPriority {
    LOWEST = 0,
    LOW = 1,
    NORMAL = 2,
    HIGH = 3,
    HIGHEST = 4
}

declare class EventBusEvent<D extends object> {
    data: D;
    canceled: boolean;
    constructor(data: D);
}
type Event<D extends object> = new (data: D) => EventBusEvent<D>;

declare class EventBusContainer {
    private sink;
    emit<D extends object>(event: Event<D>, data: D): EventBusEvent<D>;
    on<D extends object>(event: Event<D>, callback: (event: EventBusEvent<D>) => void, priority?: EventPriority, ignoreCanceled?: boolean): {
        detach(): void;
    };
}
declare const _default: EventBusContainer;

declare function deepCopy(obj: any, mode?: 'sia' | 'json'): any;
declare function isPublisher(obj: any): obj is Publisher<any>;
declare function combine<T>(sink: Sink<T> & Publisher<T>, generator: ((sink: Sink<T>) => void)): Publisher<T>;

declare class Reactive<T> implements Publisher<T> {
    private readonly sink;
    private ref;
    constructor(value: T);
    next(value: T): Reactive<T>;
    update(fn: (value: T) => T): Reactive<T>;
    get(): T;
    subscribe({ onNext, onError, onComplete }?: {
        onNext?: ((value: T) => void) | undefined;
        onError?: ((error: Error) => void) | undefined;
        onComplete?: (() => void) | undefined;
    }): Subscription;
    asFlux(): Flux<T>;
}
declare function reactive<T>(value: T): Reactive<T>;

interface Peek<T> {
    map<R>(fn: (val: T) => R): Peek<R>;
    flatMap<R>(fn: (val: T) => Peek<R>): Peek<R>;
    peek(fn: (val: T) => void): Peek<T>;
    get(): T;
}
declare function peek<T>(obj: T): Peek<T>;
declare function lazyPeek<T>(fn: (self: () => T) => T): Peek<T>;

declare const Sinks: {
    one: () => OneSink<unknown>;
    many: () => {
        multicast: () => ManySink<unknown>;
        replay: () => {
            all: () => ReplayAllSink<unknown>;
            latest: (limit: number) => ReplayLatestSink<unknown>;
            limit: (limit: number) => ReplayLimitSink<unknown>;
        };
    };
};

declare const Schedulers: {
    immediate: () => ImmediateScheduler;
    micro: () => MicroScheduler;
    macro: () => MacroScheduler;
    delay: (ms: number) => DelayScheduler;
};

export { AbstractPipePublisher, BackpressurePublisher, _default$6 as Base64, _default$1 as Cache, type CacheOptions, type CancellableScheduler, DelayScheduler, EventBusEvent as Event, _default as EventBus, EventBusContainer, EventBusEvent, EventPriority, Flux, ImmediateScheduler, _default$3 as Json, MacroScheduler, ManySink, MicroScheduler, Mono, OneSink, type OverflowPolicy, type PipePublisher, type Publisher, _default$2 as Rc4, Reactive, type RemoveReason, ReplayAllSink, ReplayLatestSink, ReplayLimitSink, type Scheduler, Schedulers, _default$5 as Sia, type Sink, Sinks, type StorageType, _default$4 as Stringify, type Subscriber, type Subscription, combine, deepCopy, isPublisher, lazyPeek, peek, reactive };
