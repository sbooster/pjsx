"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  AbstractPipePublisher: () => AbstractPipePublisher,
  BackpressurePublisher: () => BackpressurePublisher,
  Base64: () => base64_default,
  Cache: () => cache_default,
  DelayScheduler: () => DelayScheduler,
  Event: () => EventBusEvent,
  EventBus: () => eventbus_default,
  EventBusContainer: () => EventBusContainer,
  EventBusEvent: () => EventBusEvent,
  EventPriority: () => priority_default,
  Flux: () => Flux,
  ImmediateScheduler: () => ImmediateScheduler,
  Json: () => json_default,
  MacroScheduler: () => MacroScheduler,
  ManySink: () => ManySink,
  MicroScheduler: () => MicroScheduler,
  Mono: () => Mono,
  OneSink: () => OneSink,
  Rc4: () => rc4_default,
  Reactive: () => Reactive,
  ReplayAllSink: () => ReplayAllSink,
  ReplayLatestSink: () => ReplayLatestSink,
  ReplayLimitSink: () => ReplayLimitSink,
  Schedulers: () => Schedulers,
  Sia: () => sia_default,
  Sinks: () => Sinks,
  Stringify: () => stringify_default,
  combine: () => combine,
  deepCopy: () => deepCopy,
  isPublisher: () => isPublisher,
  lazyPeek: () => lazyPeek,
  peek: () => peek,
  reactive: () => reactive
});
module.exports = __toCommonJS(index_exports);

// src/sinks/backpressure/index.ts
var BackpressureSink = class {
  constructor() {
    this.subscribers = /* @__PURE__ */ new Set();
    this.completed = false;
  }
  emit(action, subscriber) {
    switch (action.emit) {
      case "next": {
        try {
          subscriber.onNext(action.data);
        } catch (error) {
          subscriber.onError(error);
        }
        break;
      }
      case "error": {
        subscriber.onError(action.data);
        break;
      }
      case "complete": {
        subscriber.onComplete();
      }
    }
  }
  flush(backpressure) {
    const data = backpressure.data;
    while (backpressure.requested > 0 && data.length > 0) {
      backpressure.requested--;
      this.emit(data.shift(), backpressure.subscriber);
    }
    if (data.length > 0 && data[0].emit == "complete") {
      backpressure.requested++;
      this.flush(backpressure);
    }
  }
  subscribe(subscriber) {
    const backpressure = {
      subscriber,
      data: [],
      requested: 0
    };
    this.subscribers.add(backpressure);
    return {
      request: (count) => {
        backpressure.requested += count;
        this.flush(backpressure);
      },
      unsubscribe: () => {
        backpressure.data = [];
        this.subscribers.delete(backpressure);
      }
    };
  }
  validateEmit() {
    if (this.completed) throw new Error("The completed sink is not accepting new emits.");
  }
  next(value) {
    this.validateEmit();
    for (const subscriber of this.subscribers) {
      subscriber.data.push({ emit: "next", data: value });
      this.flush(subscriber);
    }
  }
  error(error) {
    this.validateEmit();
    for (const subscriber of this.subscribers) {
      subscriber.data.push({ emit: "error", data: error });
      this.flush(subscriber);
    }
  }
  complete() {
    if (this.completed) return;
    this.completed = true;
    for (const subscriber of this.subscribers) {
      subscriber.data.push({ emit: "complete" });
      this.flush(subscriber);
    }
    this.subscribers.clear();
  }
};

// src/sinks/many/index.ts
var ManySink = class extends BackpressureSink {
};

// src/sinks/many/replay/index.ts
var ReplaySink = class extends ManySink {
  constructor() {
    super(...arguments);
    this.buffer = [];
  }
  replay(subscriber) {
    for (const action of this.buffer) {
      this.emit(action, subscriber);
    }
  }
  store(emit, data) {
    this.buffer.push({ emit, data });
  }
  next(value) {
    super.next(value);
    this.store("next", value);
  }
  error(error) {
    super.error(error);
    this.store("error", error);
  }
  complete() {
    super.complete();
    this.store("complete");
  }
  subscribe(subscriber) {
    const subscription = super.subscribe(subscriber);
    this.replay(subscriber);
    return subscription;
  }
};

// src/sinks/many/replay/all/index.ts
var ReplayAllSink = class extends ReplaySink {
};

// src/sinks/many/replay/limit/index.ts
var ReplayLimitSink = class extends ReplaySink {
  constructor(limit) {
    super();
    this.limit = limit;
    if (limit < 1) throw new Error("LimitSink: limit must be > 0");
  }
  store(emit, data) {
    if (this.buffer.length <= this.limit) super.store(emit, data);
  }
};

// src/sinks/many/replay/latest/index.ts
var ReplayLatestSink = class extends ReplaySink {
  constructor(limit) {
    super();
    this.limit = limit;
    if (limit < 1) throw new Error("LatestSink: limit must be > 0");
  }
  store(emit, data) {
    super.store(emit, data);
    if (this.buffer.length > this.limit) this.buffer.shift();
  }
};

// src/sinks/one/index.ts
var OneSink = class extends BackpressureSink {
  subscribe(subscriber) {
    if (this.subscribers.size > 0) {
      throw new Error("Only one subscriber is allowed for OneSink.");
    }
    return super.subscribe(subscriber);
  }
  next(value) {
    super.next(value);
    this.complete();
  }
  error(error) {
    super.error(error);
    this.complete();
  }
};

// src/schedulers/immediate/index.ts
var ImmediateScheduler = class {
  schedule(task) {
    task();
  }
};

// src/schedulers/micro/index.ts
var MicroScheduler = class {
  schedule(task) {
    Promise.resolve().then(task);
  }
};

// src/schedulers/macro/index.ts
var MacroScheduler = class {
  schedule(task) {
    setTimeout(task, 0);
  }
};

// src/schedulers/delay/index.ts
var DelayScheduler = class {
  constructor(delay) {
    this.delay = delay;
  }
  schedule(task) {
    const id = setTimeout(task, this.delay);
    return {
      cancel: () => clearTimeout(id)
    };
  }
};

// src/publishers/index.ts
var BackpressurePublisher = class {
  constructor(sink) {
    this.backpressure = [];
    this.requested = 0;
    this.subscription = sink.subscribe({
      onNext: (value) => {
        this.backpressure.push({ emit: "next", data: value });
        this.flush();
      },
      onError: (error) => {
        this.backpressure.push({ emit: "error", data: error });
        this.flush();
      },
      onComplete: () => {
        this.subscription.unsubscribe();
        this.backpressure.push({ emit: "complete" });
        this.flush();
      }
    });
    this.subscription.request(Number.MAX_SAFE_INTEGER);
  }
  emit(action) {
    switch (action.emit) {
      case "next": {
        try {
          this.subscriber?.onNext(action.data);
        } catch (error) {
          this.subscriber?.onError(error);
        }
        break;
      }
      case "error": {
        this.subscriber?.onError(action.data);
        break;
      }
      case "complete": {
        this.subscriber?.onComplete();
      }
    }
  }
  flush() {
    while (this.requested > 0 && this.backpressure.length > 0) {
      this.requested--;
      this.emit(this.backpressure.shift());
    }
    if (this.subscriber != null && this.backpressure[0]?.emit == "complete") {
      this.emit(this.backpressure.shift());
    }
  }
  subscribe(subscriber) {
    if (this.subscriber != null) throw new Error("Backpressure unicast publisher is not accepting new subscribers");
    this.subscriber = subscriber;
    return {
      request: (count) => {
        this.requested += count;
        this.flush();
      },
      unsubscribe: () => {
        this.backpressure = [];
        this.subscription.unsubscribe();
      }
    };
  }
};

// src/publishers/pipe/index.ts
var AbstractPipePublisher = class {
  constructor(publisher) {
    this.publisher = publisher;
  }
  wrap(publisher) {
    return Reflect.construct(Reflect.getPrototypeOf(this).constructor, [publisher]);
  }
  pipe(producer, onSubscribe, onRequest, onUnsubscribe) {
    const many = this.sinkType() == "many";
    const sink = !many ? new OneSink() : new ManySink();
    const unicast = new class A extends BackpressurePublisher {
      subscribe(subscriber) {
        onSubscribe?.(subscriber);
        const sub = super.subscribe(subscriber);
        return {
          request(count) {
            sub.request(count);
            onRequest?.(count);
          },
          unsubscribe() {
            sub.unsubscribe();
            onUnsubscribe?.();
          }
        };
      }
    }(sink);
    try {
      producer(
        (value) => {
          if (many && value == null) onRequest?.(1);
          else sink.next(value);
        },
        (error) => {
          sink.error(error);
          onRequest?.(1);
        },
        () => sink.complete()
      );
    } catch (error) {
      sink.error(error);
    }
    return this.wrap(unicast);
  }
  map(fn) {
    let sub;
    return this.pipe((onNext, onError, onComplete) => sub = this.subscribe({
      onNext: (value) => onNext(fn(value)),
      onError,
      onComplete
    }), void 0, (request) => sub?.request(request), () => sub?.unsubscribe());
  }
  mapNotNull(fn) {
    return this.map(fn).filter((v) => v != null);
  }
  flatMap(fn) {
    let sub;
    let req = 0;
    return this.pipe(
      (onNext, onError, onComplete) => sub = this.subscribe({
        onNext: (value) => {
          fn(value).subscribe({
            onNext,
            onError,
            onComplete: () => this.sinkType() == "many" ? () => {
            } : onComplete
          }).request(req);
        },
        onError,
        onComplete
      }),
      void 0,
      (request) => sub?.request(req = request),
      () => sub?.unsubscribe()
    );
  }
  filter(predicate) {
    let sub;
    return this.pipe((onNext, onError, onComplete) => sub = this.subscribe({
      onNext: (value) => predicate(value) ? onNext(value) : this.sinkType() == "many" ? onNext(null) : onComplete(),
      onError,
      onComplete
    }), void 0, (request) => sub?.request(request), () => sub?.unsubscribe());
  }
  filterWhen(predicate) {
    let sub;
    let req = 0;
    return this.pipe((onNext, onError, onComplete) => sub = this.subscribe({
      onNext: (value) => predicate(value).subscribe({
        onNext: (bool) => bool ? onNext(value) : this.sinkType() == "many" ? onNext(null) : onComplete(),
        onError,
        onComplete: () => this.sinkType() == "many" ? () => {
        } : onComplete
      }).request(req),
      onError,
      onComplete
    }), void 0, (request) => sub?.request(req = request), () => sub?.unsubscribe());
  }
  cast() {
    return this;
  }
  switchIfEmpty(alternative) {
    let sub;
    let req = 0;
    return this.pipe((onNext, onError, onComplete) => {
      let emitted = false;
      sub = this.subscribe({
        onNext(value) {
          emitted = true;
          onNext(value);
        },
        onError(error) {
          emitted = true;
          onError(error);
        },
        onComplete: () => {
          return emitted ? onComplete() : alternative.subscribe({ onNext, onError, onComplete }).request(req);
        }
      });
    }, void 0, (request) => sub?.request(req = request), () => sub?.unsubscribe());
  }
  onErrorReturn(replacement) {
    let sub;
    let req = 0;
    return this.pipe((onNext, onError, onComplete) => sub = this.subscribe({
      onNext,
      onError: () => replacement.subscribe({ onNext, onError, onComplete }).request(req),
      onComplete
    }), void 0, (request) => sub?.request(req = request), () => sub?.unsubscribe());
  }
  onErrorContinue(predicate) {
    let sub;
    return this.pipe((onNext, onError, onComplete) => sub = this.subscribe({
      onNext,
      onError: (error) => predicate(error) ? this.sinkType() == "many" ? onNext(null) : onComplete() : onError(error),
      onComplete
    }), void 0, (request) => sub?.request(request), () => sub?.unsubscribe());
  }
  doFirst(fn) {
    let sub;
    return this.pipe(
      (onNext, onError, onComplete) => {
        fn();
        sub = this.subscribe({ onNext, onError, onComplete });
      },
      void 0,
      (request) => sub?.request(request),
      () => sub?.unsubscribe()
    );
  }
  doOnNext(fn) {
    let sub;
    return this.pipe((onNext, onError, onComplete) => sub = this.subscribe({
      onNext: (value) => {
        fn(value);
        onNext(value);
      },
      onError,
      onComplete
    }), void 0, (request) => sub?.request(request), () => sub?.unsubscribe());
  }
  doFinally(fn) {
    let sub;
    return this.pipe((onNext, onError, onComplete) => sub = this.subscribe({
      onNext,
      onError,
      onComplete: () => {
        try {
          onComplete();
        } finally {
          fn();
        }
      }
    }), void 0, (request) => sub?.request(request), () => sub?.unsubscribe());
  }
  doOnSubscribe(fn) {
    let sub;
    return this.pipe((onNext, onError, onComplete) => sub = this.subscribe({
      onNext,
      onError,
      onComplete
    }), (subscriber) => fn(subscriber), (request) => sub?.request(request), () => sub?.unsubscribe());
  }
  publishOn(scheduler) {
    let sub;
    return this.pipe((onNext, onError, onComplete) => sub = this.subscribe({
      onNext: (value) => scheduler.schedule(() => onNext(value)),
      onError: (error) => scheduler.schedule(() => onError(error)),
      onComplete: () => scheduler.schedule(() => onComplete())
    }), void 0, (request) => sub?.request(request), () => sub?.unsubscribe());
  }
  subscribeOn(scheduler) {
    let sub;
    return this.pipe(
      (onNext, onError, onComplete) => sub = new Promise((resolve) => scheduler.schedule(() => resolve(this.subscribe({
        onNext,
        onError,
        onComplete
      })))),
      void 0,
      (request) => sub?.then((value) => value.request(request)),
      () => sub?.then((value) => value.unsubscribe())
    );
  }
};

// src/serializers/json/index.ts
var json_default = {
  serialize(obj) {
    return JSON.stringify(obj, (_key, value) => {
      if (value == null) return value;
      switch (Object.getPrototypeOf(value)?.constructor) {
        case Map:
          return {
            "__type__": "Map",
            "value": Array.from(value.entries())
          };
        case Set:
          return {
            "__type__": "Set",
            "value": Array.from(value)
          };
        default:
          return value;
      }
    });
  },
  deserialize(obj) {
    return JSON.parse(obj, (_key, value) => {
      switch (value?.__type__) {
        case "Map":
          return new Map(value.value);
        case "Set":
          return new Set(value.value);
        default:
          return value;
      }
    });
  }
};

// src/serializers/sia/types/index.ts
var types_default = Object.fromEntries([
  "null",
  "undefined",
  "uint8",
  "uint16",
  "uint32",
  "uint64",
  "uint128",
  "uintn",
  "int8",
  "int16",
  "int32",
  "int64",
  "int128",
  "intn",
  "float8",
  "float16",
  "float32",
  "float64",
  "float128",
  "floatn",
  "record",
  "ref8",
  "ref16",
  "ref32",
  "ref64",
  "ref128",
  "refn",
  "utfz",
  "string8",
  "string16",
  "string32",
  "string64",
  "string128",
  "stringn",
  "bin8",
  "bin16",
  "bin32",
  "bin64",
  "bin128",
  "binN",
  "true",
  "false",
  "date",
  "date64",
  "constructor8",
  "constructor16",
  "constructor32",
  "array8",
  "array16",
  "array32",
  "array64",
  "array128",
  "objectStart",
  "objectEnd",
  "setStart",
  "setEnd",
  "mapStart",
  "mapEnd",
  "onull",
  "onumber",
  "ostring",
  "otrue",
  "ofalse",
  "regexp",
  "date",
  "int8array8",
  "int8array16",
  "int8array32",
  "uint8array8",
  "uint8array16",
  "uint8array32",
  "uint8clampedarray8",
  "uint8clampedarray16",
  "uint8clampedarray32",
  "int16array8",
  "int16array16",
  "int16array32",
  "uint16array8",
  "uint16array16",
  "uint16array32",
  "int32array8",
  "int32array16",
  "int32array32",
  "uint32array8",
  "uint32array16",
  "uint32array32",
  "float32array8",
  "float32array16",
  "float32array32",
  "float64array8",
  "float64array16",
  "float64array32",
  "bigint64array8",
  "bigint64array16",
  "bigint64array32",
  "biguint64array8",
  "biguint64array16",
  "biguint64array32",
  "bigint8",
  "bigint16",
  "bigint32",
  "bigint64",
  "bigintN",
  "biguint8",
  "biguint16",
  "biguint32",
  "biguint64",
  "biguintN",
  "oref8",
  "oref16",
  "oref32"
].map((r, a) => [r, a]));

// src/serializers/sia/writer/Uint8ArrayWriter.ts
var Uint8ArrayWriter = class {
  constructor() {
    this.textEncoder = new TextEncoder();
  }
  writeString(str, offset) {
    const worstCaseLength = str.length * 3;
    const requiredLength = offset + worstCaseLength;
    if (requiredLength > this.buffer.length) {
      const newBufferSize = Math.pow(2, Math.ceil(Math.log2(requiredLength)));
      const newBuffer = new Uint8Array(newBufferSize);
      newBuffer.set(this.buffer);
      this.buffer = newBuffer;
    }
    const view = this.buffer.subarray(offset);
    const { written } = this.textEncoder.encodeInto(str, view);
    return written;
  }
  writeUInt8(number) {
    const offset = this.offset;
    const end = offset + 1;
    if (end <= this.buffer.length) {
      this.buffer[offset] = number;
      this.offset += 1;
      return this.offset;
    } else {
      const bufferSizeNeeded = Math.ceil(Math.log2(end));
      const newBufferSize = Math.pow(2, bufferSizeNeeded);
      const newBuffer = new Uint8Array(newBufferSize);
      newBuffer.set(this.buffer);
      this.buffer = newBuffer;
      this.buffer[offset] = number;
      this.offset += 1;
      return this.offset;
    }
  }
  writeUInt16(number) {
    const end = this.offset + 2;
    if (end <= this.buffer.length) {
      new DataView(this.buffer.buffer).setUint16(this.offset, number, true);
      this.offset += 2;
      return this.offset;
    } else {
      const bufferSizeNeeded = Math.ceil(Math.log2(end));
      const newBufferSize = Math.pow(2, bufferSizeNeeded);
      const newBuffer = new Uint8Array(newBufferSize);
      newBuffer.set(this.buffer);
      this.buffer = newBuffer;
      new DataView(this.buffer.buffer).setUint16(this.offset, number, true);
      this.offset += 2;
      return this.offset;
    }
  }
  writeUInt32(number) {
    const end = this.offset + 4;
    if (end <= this.buffer.length) {
      new DataView(this.buffer.buffer).setUint32(this.offset, number, true);
      this.offset += 4;
      return this.offset;
    } else {
      const bufferSizeNeeded = Math.ceil(Math.log2(end));
      const newBufferSize = Math.pow(2, bufferSizeNeeded);
      const newBuffer = new Uint8Array(newBufferSize);
      newBuffer.set(this.buffer);
      this.buffer = newBuffer;
      new DataView(this.buffer.buffer).setUint32(this.offset, number, true);
      this.offset += 4;
      return this.offset;
    }
  }
  writeBigUInt64(number) {
    const end = this.offset + 8;
    if (end <= this.buffer.length) {
      new DataView(this.buffer.buffer).setBigUint64(this.offset, number, true);
      this.offset += 8;
      return this.offset;
    } else {
      const bufferSizeNeeded = Math.ceil(Math.log2(end));
      const newBufferSize = Math.pow(2, bufferSizeNeeded);
      const newBuffer = new Uint8Array(newBufferSize);
      newBuffer.set(this.buffer);
      this.buffer = newBuffer;
      new DataView(this.buffer.buffer).setBigUint64(this.offset, number, true);
      this.offset += 8;
      return this.offset;
    }
  }
  writeBigUInt64AtOffset(number, offset) {
    const end = offset + 8;
    if (end <= this.buffer.length) {
      new DataView(this.buffer.buffer).setBigUint64(offset, number, true);
      return offset + 8;
    } else {
      const bufferSizeNeeded = Math.ceil(Math.log2(end));
      const newBufferSize = Math.pow(2, bufferSizeNeeded);
      const newBuffer = new Uint8Array(newBufferSize);
      newBuffer.set(this.buffer);
      this.buffer = newBuffer;
      new DataView(this.buffer.buffer).setBigUint64(offset, number, true);
      return offset + 8;
    }
  }
  writeInt8(number) {
    const end = this.offset + 1;
    if (end <= this.buffer.length) {
      new DataView(this.buffer.buffer).setInt8(this.offset, number);
      this.offset += 1;
      return this.offset;
    } else {
      const bufferSizeNeeded = Math.ceil(Math.log2(end));
      const newBufferSize = Math.pow(2, bufferSizeNeeded);
      const newBuffer = new Uint8Array(newBufferSize);
      newBuffer.set(this.buffer);
      this.buffer = newBuffer;
      new DataView(this.buffer.buffer).setInt8(this.offset, number);
      this.offset += 1;
      return this.offset;
    }
  }
  writeInt16(number) {
    const end = this.offset + 2;
    if (end <= this.buffer.length) {
      new DataView(this.buffer.buffer).setInt16(this.offset, number, true);
      this.offset += 2;
      return this.offset;
    } else {
      const bufferSizeNeeded = Math.ceil(Math.log2(end));
      const newBufferSize = Math.pow(2, bufferSizeNeeded);
      const newBuffer = new Uint8Array(newBufferSize);
      newBuffer.set(this.buffer);
      this.buffer = newBuffer;
      new DataView(this.buffer.buffer).setInt16(this.offset, number, true);
      this.offset += 2;
      return this.offset;
    }
  }
  writeInt32(number) {
    const end = this.offset + 4;
    if (end <= this.buffer.length) {
      new DataView(this.buffer.buffer).setInt32(this.offset, number, true);
      this.offset += 4;
      return this.offset;
    } else {
      const bufferSizeNeeded = Math.ceil(Math.log2(end));
      const newBufferSize = Math.pow(2, bufferSizeNeeded);
      const newBuffer = new Uint8Array(newBufferSize);
      newBuffer.set(this.buffer);
      this.buffer = newBuffer;
      new DataView(this.buffer.buffer).setInt32(this.offset, number, true);
      this.offset += 4;
      return this.offset;
    }
  }
  writeBigInt64(number) {
    const end = this.offset + 8;
    if (end <= this.buffer.length) {
      new DataView(this.buffer.buffer).setBigInt64(this.offset, number, true);
      this.offset += 8;
      return this.offset;
    } else {
      const bufferSizeNeeded = Math.ceil(Math.log2(end));
      const newBufferSize = Math.pow(2, bufferSizeNeeded);
      const newBuffer = new Uint8Array(newBufferSize);
      newBuffer.set(this.buffer);
      this.buffer = newBuffer;
      new DataView(this.buffer.buffer).setBigInt64(this.offset, number, true);
      this.offset += 8;
      return this.offset;
    }
  }
  writeDouble(number) {
    const end = this.offset + 8;
    if (end <= this.buffer.length) {
      new DataView(this.buffer.buffer).setFloat64(this.offset, number, true);
      this.offset += 8;
      return this.offset;
    } else {
      const bufferSizeNeeded = Math.ceil(Math.log2(end));
      const newBufferSize = Math.pow(2, bufferSizeNeeded);
      const newBuffer = new Uint8Array(newBufferSize);
      newBuffer.set(this.buffer);
      this.buffer = newBuffer;
      new DataView(this.buffer.buffer).setFloat64(this.offset, number, true);
      this.offset += 8;
      return this.offset;
    }
  }
};

// src/serializers/sia/utfz/index.ts
var fromCharCode = String.fromCharCode;
var utfz_default = {
  pack: (str, length, buf, offset) => {
    const start = offset;
    let currHigh = 0;
    for (let i = 0; i < length; i++) {
      const code = str.charCodeAt(i);
      const high = code >> 8;
      if (high !== currHigh) {
        buf[i + offset++] = 0;
        buf[i + offset++] = high;
        currHigh = high;
      }
      const low = code & 255;
      buf[i + offset] = low;
      if (low === 0) {
        buf[i + ++offset] = currHigh;
      }
    }
    return length + offset - start;
  },
  unpack: (buf, length, offset) => {
    const end = offset + length;
    let currHigh = 0;
    const codes = [];
    for (let i = offset; i < end; i++) {
      const curr = buf[i];
      if (curr === 0) {
        if (buf[i + 1] === currHigh) {
          codes.push(buf[i++] + (currHigh << 8));
        } else {
          currHigh = buf[++i];
        }
      } else {
        codes.push(buf[i] + (currHigh << 8));
      }
    }
    return fromCharCode.apply(null, codes);
  }
};

// src/serializers/sia/writer/TypeWriter.ts
var big_zero = BigInt(0);
var big_one = BigInt(1);
var big_8 = BigInt(8);
var big2p8m1 = BigInt(2 ** 8 - 1);
var big_16 = BigInt(16);
var big_2p16m1 = BigInt(2 ** 16 - 1);
var big_32 = BigInt(32);
var big_2p32m1 = BigInt(2 ** 32 - 1);
var big_64 = BigInt(64);
var big_0x100 = BigInt(256);
var big_0x10000 = BigInt(65536);
var big_0x100000000 = BigInt(4294967296);
var big_m0x80 = BigInt(-128);
var big_m0x8000 = BigInt(-32768);
var big_m0x80000000 = BigInt(-2147483648);
var big_max_safe_int = 18446744073709551615n;
var big_min_safe_int = BigInt(Number.MIN_SAFE_INTEGER);
var TypeWriter = class extends Uint8ArrayWriter {
  addOString(string) {
    this.writeUInt8(types_default.ostring);
    this.addString(string.toString());
  }
  addString(string) {
    const strLen = string.length;
    if (strLen < 60) {
      this.writeUInt8(types_default.utfz);
      const lenIndex = this.offset;
      this.offset++;
      const byteLength = utfz_default.pack(string, strLen, this.buffer, this.offset);
      this.buffer[lenIndex] = byteLength;
      this.offset += byteLength;
      return;
    }
    const maxBytes = strLen * 3;
    const startOffset = this.offset;
    if (maxBytes < 256) {
      this.buffer[this.offset++] = types_default.string8;
      const lenIndex = this.offset;
      this.offset++;
      const byteLength = this.writeString(string, this.offset);
      this.buffer[lenIndex] = byteLength;
      this.offset += byteLength;
    } else if (maxBytes < 65536) {
      this.buffer[this.offset++] = types_default.string16;
      const lenIndex = this.offset;
      this.offset += 2;
      const byteLength = this.writeString(string, this.offset);
      this.buffer[lenIndex] = byteLength & 255;
      this.buffer[lenIndex + 1] = byteLength >> 8 & 255;
      this.offset += byteLength;
    } else {
      this.buffer[this.offset++] = types_default.string32;
      const lenIndex = this.offset;
      this.offset += 4;
      const byteLength = this.writeString(string, this.offset);
      this.buffer[lenIndex] = byteLength & 255;
      this.buffer[lenIndex + 1] = byteLength >> 8 & 255;
      this.buffer[lenIndex + 2] = byteLength >> 16 & 255;
      this.buffer[lenIndex + 3] = byteLength >>> 24 & 255;
      this.offset += byteLength;
    }
  }
  ensureCapacity(requiredLength) {
    if (this.buffer.length < requiredLength) {
      const newSize = Math.pow(2, Math.ceil(Math.log2(requiredLength)));
      const newBuffer = new Uint8Array(newSize);
      newBuffer.set(this.buffer);
      this.buffer = newBuffer;
    }
  }
  addRef(ref) {
    if (ref < 256) {
      this.writeUInt8(types_default.ref8);
      this.writeUInt8(ref);
    } else if (ref < 65536) {
      this.writeUInt8(types_default.ref16);
      this.writeUInt16(ref);
    } else if (ref < 4294967296) {
      this.writeUInt8(types_default.ref32);
      this.writeUInt32(ref);
    } else {
      throw `Ref size ${ref} is too big`;
    }
  }
  addORef(ref) {
    if (ref < 256) {
      this.writeUInt8(types_default.oref8);
      this.writeUInt8(ref);
    } else if (ref < 65536) {
      this.writeUInt8(types_default.oref16);
      this.writeUInt16(ref);
    } else if (ref < 4294967296) {
      this.writeUInt8(types_default.oref32);
      this.writeUInt32(ref);
    } else {
      throw `Object Ref size ${ref} is too big`;
    }
  }
  addNumber(number) {
    if (Number.isInteger(number)) return this.addInteger(number);
    return this.addFloat(number);
  }
  addBigInt(number) {
    const dv = new DataView(this.buffer.buffer, this.buffer.byteOffset, this.buffer.length);
    if (number < big_zero) {
      if (number >= big_m0x80) {
        this.writeUInt8(types_default.bigint8);
        this.writeInt8(Number(number));
        return;
      } else if (number >= big_m0x8000) {
        this.writeUInt8(types_default.bigint16);
        this.writeInt16(Number(number));
        return;
      } else if (number >= big_m0x80000000) {
        this.writeUInt8(types_default.bigint32);
        this.writeInt32(Number(number));
        return;
      } else if (number >= big_min_safe_int) {
        this.writeUInt8(types_default.bigint64);
        this.writeBigInt64(number);
        return;
      } else {
        this.writeUInt8(types_default.bigintN);
        number = -number;
      }
    } else {
      if (number < big_0x100) {
        this.writeUInt8(types_default.biguint8);
        this.writeUInt8(Number(number));
        return;
      } else if (number < big_0x10000) {
        this.writeUInt8(types_default.biguint16);
        this.writeUInt16(Number(number));
        return;
      } else if (number < big_0x100000000) {
        this.writeUInt8(types_default.biguint32);
        this.writeUInt32(Number(number));
        return;
      } else if (number <= big_max_safe_int) {
        this.writeUInt8(types_default.biguint64);
        this.writeBigUInt64(number);
        return;
      } else {
        this.writeUInt8(types_default.biguintN);
      }
    }
    let length = 0;
    const startOffset = this.offset + 1;
    while (number > big_zero) {
      const chunk = BigInt.asUintN(64, number);
      this.writeBigUInt64AtOffset(chunk, startOffset + 8 * length);
      number = number >> big_64;
      length++;
    }
    dv.setUint8(this.offset, length);
    this.offset = startOffset + 8 * length;
  }
  addInteger(number) {
    if (number < 0) {
      if (number >= -128) {
        this.writeUInt8(types_default.int8);
        this.writeInt8(number);
      } else if (number >= -32768) {
        this.writeUInt8(types_default.int16);
        this.writeInt16(number);
      } else if (number >= -2147483648) {
        this.writeUInt8(types_default.int32);
        this.writeInt32(number);
      } else {
        this.addFloat(number);
      }
    } else {
      if (number < 256) {
        this.writeUInt8(types_default.uint8);
        this.writeUInt8(number);
      } else if (number < 65536) {
        this.writeUInt8(types_default.uint16);
        this.writeUInt16(number);
      } else if (number < 4294967296) {
        this.writeUInt8(types_default.uint32);
        this.writeUInt32(number);
      } else {
        this.addFloat(number);
      }
    }
  }
  addFloat(number) {
    this.writeUInt8(types_default.float64);
    this.writeDouble(number);
  }
  addONumber(number) {
    this.writeUInt8(types_default.onumber);
    this.addNumber(+number);
  }
  addRegExp(regexp) {
    this.writeUInt8(types_default.regexp);
    const encodedFlags = regexp.global << 0 | regexp.ignoreCase << 1 | regexp.multiline << 2 | regexp.unicode << 3 | regexp.sticky << 4;
    this.writeInt8(encodedFlags);
    this.addString(regexp.source);
  }
  addDate(date) {
    this.writeUInt8(types_default.date);
    this.writeDouble(date.getTime());
  }
  startArray(length) {
    if (length < 256) {
      this.writeUInt8(types_default.array8);
      this.writeUInt8(length);
    } else if (length < 65536) {
      this.writeUInt8(types_default.array16);
      this.writeUInt16(length);
    } else if (length < 4294967296) {
      this.writeUInt8(types_default.array32);
      this.writeUInt32(length);
    } else {
      throw `Array of size ${length} is too big to serialize`;
    }
  }
  startObject() {
    this.writeUInt8(types_default.objectStart);
  }
  endObject() {
    this.writeUInt8(types_default.objectEnd);
  }
  startMap() {
    this.writeUInt8(types_default.mapStart);
  }
  endMap() {
    this.writeUInt8(types_default.mapEnd);
  }
  startSet() {
    this.writeUInt8(types_default.setStart);
  }
  endSet() {
    this.writeUInt8(types_default.setEnd);
  }
  addBoolean(bool) {
    const type = bool ? types_default.true : types_default.false;
    this.writeUInt8(type);
  }
  addOBoolean(bool) {
    const type = bool ? types_default.otrue : types_default.ofalse;
    this.writeUInt8(type);
  }
  addNull() {
    this.writeUInt8(types_default.null);
  }
  addONull() {
    this.writeUInt8(types_default.onull);
  }
  addUndefined() {
    this.writeUInt8(types_default.undefined);
  }
  addArrayBuffer(item) {
    const { byteLength } = item;
    if (byteLength < 256) {
      this.writeUInt8(types_default.bin8);
      this.writeUInt8(byteLength);
      new Uint8Array(item).forEach((byte) => {
        this.writeUInt8(byte);
      });
    } else if (byteLength < 65536) {
      this.writeUInt8(types_default.bin16);
      this.writeUInt16(byteLength);
      new Uint8Array(item).forEach((byte) => {
        this.writeUInt8(byte);
      });
    } else if (byteLength < 4294967296) {
      this.writeUInt8(types_default.bin32);
      this.writeUInt32(byteLength);
      new Uint8Array(item).forEach((byte) => {
        this.writeUInt8(byte);
      });
    } else {
      throw `ArrayBuffer of size ${byteLength} is too big to serialize`;
    }
  }
  copyTypedArrayToBuffer(item) {
    const byteView = new Uint8Array(item.buffer, item.byteOffset, item.byteLength);
    this.buffer.set(byteView, this.offset);
    this.offset += item.byteLength;
  }
  addInt8Array(item) {
    const { length } = item;
    if (length < 256) {
      this.writeUInt8(types_default.int8array8);
      this.writeUInt8(length);
    } else if (length < 65536) {
      this.writeUInt8(types_default.int8array16);
      this.writeUInt16(length);
    } else if (length < 4294967296) {
      this.writeUInt8(types_default.int8array32);
      this.writeUInt32(length);
    } else {
      throw new Error(`Buffer of size ${length} is too big to serialize`);
    }
    this.copyTypedArrayToBuffer(item);
  }
  addUint8Array(item) {
    const { length } = item;
    if (item.length < 256) {
      this.writeUInt8(types_default.uint8array8);
      this.writeUInt8(length);
    } else if (item.length < 65536) {
      this.writeUInt8(types_default.uint8array16);
      this.writeUInt16(length);
    } else if (item.length < 4294967296) {
      this.writeUInt8(types_default.uint8array32);
      this.writeUInt32(length);
    } else {
      throw `Buffer of size ${length} is too big to serialize`;
    }
    this.copyTypedArrayToBuffer(item);
  }
  addUint8ClampedArray(item) {
    const { length } = item;
    if (item.length < 256) {
      this.writeUInt8(types_default.uint8clampedarray8);
      this.writeUInt8(length);
    } else if (item.length < 65536) {
      this.writeUInt8(types_default.uint8clampedarray16);
      this.writeUInt16(length);
    } else if (item.length < 4294967296) {
      this.writeUInt8(types_default.uint8clampedarray32);
      this.writeUInt32(length);
    } else {
      throw `Buffer of size ${length} is too big to serialize`;
    }
    this.copyTypedArrayToBuffer(item);
  }
  addInt16Array(item) {
    const { length } = item;
    if (item.length < 256) {
      this.writeUInt8(types_default.int16array8);
      this.writeUInt8(length);
    } else if (item.length < 65536) {
      this.writeUInt8(types_default.int16array16);
      this.writeUInt16(length);
    } else if (item.length < 4294967296) {
      this.writeUInt8(types_default.int16array32);
      this.writeUInt32(length);
    } else {
      throw `Buffer of size ${length} is too big to serialize`;
    }
    this.copyTypedArrayToBuffer(item);
  }
  addUint16Array(item) {
    const { length } = item;
    if (item.length < 256) {
      this.writeUInt8(types_default.uint16array8);
      this.writeUInt8(length);
    } else if (item.length < 65536) {
      this.writeUInt8(types_default.uint16array16);
      this.writeUInt16(length);
    } else if (item.length < 4294967296) {
      this.writeUInt8(types_default.uint16array32);
      this.writeUInt32(length);
    } else {
      throw `Buffer of size ${length} is too big to serialize`;
    }
    this.copyTypedArrayToBuffer(item);
  }
  addInt32Array(item) {
    const { length } = item;
    if (item.length < 256) {
      this.writeUInt8(types_default.int32array8);
      this.writeUInt8(length);
    } else if (item.length < 65536) {
      this.writeUInt8(types_default.int32array16);
      this.writeUInt16(length);
    } else if (item.length < 4294967296) {
      this.writeUInt8(types_default.int32array32);
      this.writeUInt32(length);
    } else {
      throw `Buffer of size ${length} is too big to serialize`;
    }
    this.copyTypedArrayToBuffer(item);
  }
  addUint32Array(item) {
    const { length } = item;
    if (item.length < 256) {
      this.writeUInt8(types_default.uint32array8);
      this.writeUInt8(length);
    } else if (item.length < 65536) {
      this.writeUInt8(types_default.uint32array16);
      this.writeUInt16(length);
    } else if (item.length < 4294967296) {
      this.writeUInt8(types_default.uint32array32);
      this.writeUInt32(length);
    } else {
      throw `Buffer of size ${length} is too big to serialize`;
    }
    this.copyTypedArrayToBuffer(item);
  }
  addFloat32Array(item) {
    const { length } = item;
    if (item.length < 256) {
      this.writeUInt8(types_default.float32array8);
      this.writeUInt8(length);
    } else if (item.length < 65536) {
      this.writeUInt8(types_default.float32array16);
      this.writeUInt16(length);
    } else if (item.length < 4294967296) {
      this.writeUInt8(types_default.float32array32);
      this.writeUInt32(length);
    } else {
      throw `Buffer of size ${length} is too big to serialize`;
    }
    this.copyTypedArrayToBuffer(item);
  }
  addFloat64Array(item) {
    const { length } = item;
    if (item.length < 256) {
      this.writeUInt8(types_default.float64array8);
      this.writeUInt8(length);
    } else if (item.length < 65536) {
      this.writeUInt8(types_default.float64array16);
      this.writeUInt16(length);
    } else if (item.length < 4294967296) {
      this.writeUInt8(types_default.float64array32);
      this.writeUInt32(length);
    } else {
      throw `Buffer of size ${length} is too big to serialize`;
    }
    this.copyTypedArrayToBuffer(item);
  }
  addBigInt64Array(item) {
    const { length } = item;
    if (item.length < 256) {
      this.writeUInt8(types_default.bigint64array8);
      this.writeUInt8(length);
    } else if (item.length < 65536) {
      this.writeUInt8(types_default.bigint64array16);
      this.writeUInt16(length);
    } else if (item.length < 4294967296) {
      this.writeUInt8(types_default.bigint64array32);
      this.writeUInt32(length);
    } else {
      throw `Buffer of size ${length} is too big to serialize`;
    }
    this.copyTypedArrayToBuffer(item);
  }
  addBigUint64Array(item) {
    const { length } = item;
    if (item.length < 256) {
      this.writeUInt8(types_default.biguint64array8);
      this.writeUInt8(length);
    } else if (item.length < 65536) {
      this.writeUInt8(types_default.biguint64array16);
      this.writeUInt16(length);
    } else if (item.length < 4294967296) {
      this.writeUInt8(types_default.biguint64array32);
      this.writeUInt32(length);
    } else {
      throw `Buffer of size ${length} is too big to serialize`;
    }
    this.copyTypedArrayToBuffer(item);
  }
};

// src/serializers/sia/index.ts
var encodedFlagsLookup = [
  "",
  "g",
  "i",
  "gi",
  "m",
  "gm",
  "im",
  "gim",
  "u",
  "gu",
  "iu",
  "giu",
  "mu",
  "gmu",
  "imu",
  "gimu",
  "y",
  "gy",
  "iy",
  "giy",
  "my",
  "gmy",
  "imy",
  "gimy",
  "uy",
  "guy",
  "iuy",
  "giuy",
  "muy",
  "gmuy",
  "imuy",
  "gimuy"
];
var big_642 = 64n;
var bigIndices = new Array(2 ** 8).fill(0).map((_, i) => BigInt(i));
var textDecoder = new TextDecoder("utf-8");
var SiaSerializer = class extends TypeWriter {
  constructor(size = 33554432, decoderSize = 256e3) {
    super();
    this.size = size;
    this.decoderSize = decoderSize;
    this.keyRefIndex = 0;
    this.keyRefMap = /* @__PURE__ */ new Map();
    this.objectRefIndex = 0;
    this.objectRefMap = /* @__PURE__ */ new Map();
    this.offset = 0;
    this.registry = /* @__PURE__ */ new Map();
    this.decoderMap = new Array(decoderSize);
    this.buffer = new Uint8Array(this.size);
    this.register("string", (writer, item) => writer.addString(item));
    this.register("undefined", (writer) => writer.addUndefined());
    this.register("number", (writer, item) => writer.addNumber(item));
    this.register("boolean", (writer, item) => writer.addBoolean(item));
    this.register("bigint", (writer, item) => writer.addBigInt(item));
    this.register("object", (writer, item, keyRefMap, objectRefMap) => {
      if (item === null) return writer.addNull();
      const prototype = Object.getPrototypeOf(item);
      if (prototype === null) return writer.addONull();
      const serializer = writer.findSerializer(prototype.constructor);
      if (serializer == null) throw new Error(`Serializer for ${item} not found!`);
      serializer(writer, item, keyRefMap, objectRefMap);
    });
    this.register(Object, (writer, item, keyRefMap, objectRefMap) => {
      const ref = objectRefMap.get(item);
      if (ref === void 0) objectRefMap.set(item, writer.nextObjectRefIndex());
      else return writer.addORef(ref);
      writer.startObject();
      for (const key in item) {
        const ref2 = keyRefMap.get(key);
        if (ref2 === void 0) {
          keyRefMap.set(key, writer.nextKeyRefIndex());
          writer.addString(key);
        } else {
          writer.addRef(ref2);
        }
        writer.serialize(item[key]);
      }
      writer.endObject();
    });
    this.register(Array, (writer, item, keyRefMap, objectRefMap) => {
      const ref = objectRefMap.get(item);
      if (ref === void 0) objectRefMap.set(item, writer.nextObjectRefIndex());
      else return writer.addORef(ref);
      writer.startArray(item.length);
      for (const member of item) {
        writer.serialize(member);
      }
    });
    this.register(Set, (writer, item, keyRefMap, objectRefMap) => {
      const ref = objectRefMap.get(item);
      if (ref === void 0) objectRefMap.set(item, writer.nextObjectRefIndex());
      else return writer.addORef(ref);
      writer.startSet();
      for (const member of item) {
        writer.serialize(member);
      }
      writer.endSet();
    });
    this.register(Map, (writer, item, keyRefMap, objectRefMap) => {
      const ref = objectRefMap.get(item);
      if (ref === void 0) objectRefMap.set(item, writer.nextObjectRefIndex());
      else return writer.addORef(ref);
      writer.startMap();
      for (const [key, value] of item) {
        writer.serialize(key);
        writer.serialize(value);
      }
      writer.endMap();
    });
    this.register(Int8Array, (writer, item) => writer.addInt8Array(item));
    this.register(Uint8Array, (writer, item) => writer.addUint8Array(item));
    this.register(Uint8ClampedArray, (writer, item) => writer.addUint8ClampedArray(item));
    this.register(Int16Array, (writer, item) => writer.addInt16Array(item));
    this.register(Uint16Array, (writer, item) => writer.addUint16Array(item));
    this.register(Int32Array, (writer, item) => writer.addInt32Array(item));
    this.register(Uint32Array, (writer, item) => writer.addUint32Array(item));
    this.register(Float32Array, (writer, item) => writer.addFloat32Array(item));
    this.register(Float64Array, (writer, item) => writer.addFloat64Array(item));
    this.register(BigInt64Array, (writer, item) => writer.addBigInt64Array(item));
    this.register(BigUint64Array, (writer, item) => writer.addBigUint64Array(item));
    this.register(ArrayBuffer, (writer, item) => writer.addArrayBuffer(item));
    this.register(Date, (writer, item) => writer.addDate(item));
    this.register(RegExp, (writer, item) => writer.addRegExp(item));
    this.register(Number, (writer, item) => writer.addONumber(item));
    this.register(String, (writer, item) => writer.addOString(item));
    this.register(Boolean, (writer, item) => writer.addOBoolean(item));
  }
  register(type, fn) {
    this.registry.set(type, fn);
  }
  unregister(type) {
    this.registry.delete(type);
  }
  findSerializer(type) {
    return this.registry.get(type);
  }
  nextObjectRefIndex() {
    return this.objectRefIndex++;
  }
  nextKeyRefIndex() {
    return this.keyRefIndex++;
  }
  serialize(data) {
    const type = typeof data;
    this.findSerializer(type)?.(this, data, this.keyRefMap, this.objectRefMap);
    return this.buffer.slice(0, this.offset);
  }
  deserialize(buffer) {
    this.buffer = buffer;
    return this.readBlock(new DataView(
      buffer.buffer,
      buffer.byteOffset,
      buffer.byteLength
    ));
  }
  readKey(blockType, dv) {
    switch (blockType) {
      case types_default.ref8: {
        const ref = this.readUInt8();
        return this.decoderMap[ref];
      }
      case types_default.ref16: {
        const ref = this.readUInt16();
        return this.decoderMap[ref];
      }
      case types_default.ref32: {
        const ref = this.readUInt32(dv);
        return this.decoderMap[ref];
      }
      case types_default.utfz: {
        const length = this.readUInt8();
        const str = utfz_default.unpack(this.buffer, length, this.offset);
        this.offset += length;
        this.decoderMap[this.nextKeyRefIndex()] = str;
        return str;
      }
      case types_default.string8: {
        const length = this.readUInt8();
        const str = this.readString(length);
        this.decoderMap[this.nextKeyRefIndex()] = str;
        return str;
      }
      case types_default.string16: {
        const length = this.readUInt16();
        const str = this.readString(length);
        this.decoderMap[this.nextKeyRefIndex()] = str;
        return str;
      }
      case types_default.string32: {
        const length = this.readUInt32(dv);
        const str = this.readString(length);
        this.decoderMap[this.nextKeyRefIndex()] = str;
        return str;
      }
      default:
        throw `Key of type ${blockType} is invalid.`;
    }
  }
  readBlock(dv) {
    const blockType = this.buffer[this.offset++];
    switch (blockType) {
      case types_default.utfz: {
        const length = this.readUInt8();
        const str = utfz_default.unpack(this.buffer, length, this.offset);
        this.offset += length;
        return str;
      }
      case types_default.string8: {
        const len = this.buffer[this.offset++];
        const str = textDecoder.decode(this.buffer.subarray(this.offset, this.offset + len));
        this.offset += len;
        return str;
      }
      case types_default.string16: {
        const len = this.buffer[this.offset] | this.buffer[this.offset + 1] << 8;
        this.offset += 2;
        const str = textDecoder.decode(this.buffer.subarray(this.offset, this.offset + len));
        this.offset += len;
        return str;
      }
      case types_default.string32: {
        const len = dv.getUint32(this.offset, true);
        this.offset += 4;
        const str = textDecoder.decode(this.buffer.subarray(this.offset, this.offset + len));
        this.offset += len;
        return str;
      }
      case types_default.bin8: {
        const length = this.readUInt8();
        const buf = new Uint8Array(length);
        buf.set(this.buffer.subarray(this.offset, this.offset + length));
        this.offset += length;
        return buf;
      }
      case types_default.bin16: {
        const length = this.readUInt16();
        const buf = new Uint8Array(length);
        buf.set(this.buffer.subarray(this.offset, this.offset + length));
        this.offset += length;
        return buf;
      }
      case types_default.bin32: {
        const length = this.readUInt32(dv);
        const buf = new Uint8Array(length);
        buf.set(this.buffer.subarray(this.offset, this.offset + length));
        this.offset += length;
        return buf;
      }
      case types_default.int8: {
        return this.readInt8(dv);
      }
      case types_default.int16: {
        return this.readInt16(dv);
      }
      case types_default.int32: {
        return this.readInt32(dv);
      }
      case types_default.uint8: {
        return this.readUInt8();
      }
      case types_default.uint16: {
        return this.readUInt16();
      }
      case types_default.uint32: {
        return this.readUInt32(dv);
      }
      case types_default.float64: {
        return this.readDouble(dv);
      }
      case types_default.false:
        return false;
      case types_default.true:
        return true;
      case types_default.null:
        return null;
      case types_default.undefined:
        return void 0;
      case types_default.objectStart: {
        const obj = {};
        this.objectRefMap.set(this.nextObjectRefIndex(), obj);
        let curr = this.buffer[this.offset++];
        while (curr !== types_default.objectEnd) {
          obj[this.readKey(curr, dv)] = this.readBlock(dv);
          curr = this.buffer[this.offset++];
        }
        return obj;
      }
      case types_default.mapStart: {
        const map = /* @__PURE__ */ new Map();
        this.objectRefMap.set(this.nextObjectRefIndex(), map);
        let curr = this.buffer[this.offset];
        while (curr !== types_default.mapEnd) {
          const key = this.readBlock(dv);
          const value = this.readBlock(dv);
          map.set(key, value);
          curr = this.buffer[this.offset];
        }
        this.offset++;
        return map;
      }
      case types_default.setStart: {
        const set = /* @__PURE__ */ new Set();
        this.objectRefMap.set(this.nextObjectRefIndex(), set);
        let curr = this.buffer[this.offset];
        while (curr !== types_default.setEnd) {
          set.add(this.readBlock(dv));
          curr = this.buffer[this.offset];
        }
        this.offset++;
        return set;
      }
      case types_default.array8: {
        const length = this.readUInt8();
        const arr = new Array(length);
        this.objectRefMap.set(this.nextObjectRefIndex(), arr);
        for (let i = 0; i < length; i++) {
          arr[i] = this.readBlock(dv);
        }
        return arr;
      }
      case types_default.array16: {
        const length = this.readUInt16();
        const arr = new Array(length);
        this.objectRefMap.set(this.nextObjectRefIndex(), arr);
        for (let i = 0; i < length; i++) {
          arr[i] = this.readBlock(dv);
        }
        return arr;
      }
      case types_default.array32: {
        const length = this.readUInt32(dv);
        const arr = new Array(length);
        this.objectRefMap.set(this.nextObjectRefIndex(), arr);
        for (let i = 0; i < length; i++) {
          arr[i] = this.readBlock(dv);
        }
        return arr;
      }
      case types_default.bigint8: {
        return BigInt(this.readInt8(dv));
      }
      case types_default.bigint16: {
        return BigInt(this.readInt16(dv));
      }
      case types_default.bigint32: {
        return BigInt(this.readInt32(dv));
      }
      case types_default.bigint64: {
        return BigInt(this.readBigInt64(dv));
      }
      case types_default.bigintN: {
        const chunksCount = this.readUInt8();
        let bigIntValue = 0n;
        for (let i = 0; i < chunksCount; i++) {
          const bytesRead = dv.getBigUint64(this.offset, true);
          bigIntValue += bytesRead << big_642 * bigIndices[i];
          this.offset += 8;
        }
        return -bigIntValue;
      }
      case types_default.biguint8: {
        return BigInt(this.readUInt8());
      }
      case types_default.biguint16: {
        return BigInt(this.readUInt16());
      }
      case types_default.biguint32: {
        return BigInt(this.readUInt32(dv));
      }
      case types_default.biguint64: {
        return this.readBigUInt64(dv);
      }
      case types_default.biguintN: {
        const chunksCount = this.readUInt8();
        let bigIntValue = 0n;
        for (let i = 0; i < chunksCount; i++) {
          const bytesRead = dv.getBigUint64(this.offset, true);
          bigIntValue += bytesRead << big_642 * bigIndices[i];
          this.offset += 8;
        }
        return bigIntValue;
      }
      // For Int8Array (8-bit length marker variant)
      case types_default.int8array8: {
        const length = this.readUInt8();
        const offset = this.offset;
        this.offset += length;
        const slice = this.buffer.slice(offset, offset + length);
        const newBuffer = slice.buffer.slice(slice.byteOffset, slice.byteOffset + slice.byteLength);
        return new Int8Array(newBuffer);
      }
      // For Int8Array (16-bit length marker variant)
      case types_default.int8array16: {
        const length = this.readUInt16();
        const offset = this.offset;
        this.offset += length;
        const slice = this.buffer.slice(offset, offset + length);
        const newBuffer = slice.buffer.slice(slice.byteOffset, slice.byteOffset + slice.byteLength);
        return new Int8Array(newBuffer);
      }
      // For Int8Array (32-bit length marker variant)
      case types_default.int8array32: {
        const length = this.readUInt32(dv);
        const offset = this.offset;
        this.offset += length;
        const slice = this.buffer.slice(offset, offset + length);
        const newBuffer = slice.buffer.slice(slice.byteOffset, slice.byteOffset + slice.byteLength);
        return new Int8Array(newBuffer);
      }
      // For Uint8Array
      case types_default.uint8array8: {
        const length = this.readUInt8();
        const offset = this.offset;
        this.offset += length;
        const result = new Uint8Array(length);
        const slice = this.buffer.slice(offset, offset + length);
        result.set(Uint8Array.from(slice));
        return result;
      }
      case types_default.uint8array16: {
        const length = this.readUInt16();
        const offset = this.offset;
        this.offset += length;
        const result = new Uint8Array(length);
        const slice = this.buffer.slice(offset, offset + length);
        result.set(Uint8Array.from(slice));
        return result;
      }
      case types_default.uint8array32: {
        const length = this.readUInt32(dv);
        const offset = this.offset;
        this.offset += length;
        const result = new Uint8Array(length);
        const slice = this.buffer.slice(offset, offset + length);
        result.set(Uint8Array.from(slice));
        return result;
      }
      // For Uint8ClampedArray
      case types_default.uint8clampedarray8: {
        const length = this.readUInt8();
        const offset = this.offset;
        this.offset += length;
        const result = new Uint8ClampedArray(length);
        const slice = this.buffer.slice(offset, offset + length);
        result.set(Uint8ClampedArray.from(slice));
        return result;
      }
      case types_default.uint8clampedarray16: {
        const length = this.readUInt16();
        const offset = this.offset;
        this.offset += length;
        const result = new Uint8ClampedArray(length);
        const slice = this.buffer.slice(offset, offset + length);
        result.set(Uint8ClampedArray.from(slice));
        return result;
      }
      case types_default.uint8clampedarray32: {
        const length = this.readUInt32(dv);
        const offset = this.offset;
        this.offset += length;
        const result = new Uint8ClampedArray(length);
        const slice = this.buffer.slice(offset, offset + length);
        result.set(Uint8ClampedArray.from(slice));
        return result;
      }
      // For Int16Array (8-bit length marker variant)
      case types_default.int16array8: {
        const length = this.readUInt8();
        const offset = this.offset;
        this.offset += length * 2;
        const slice = this.buffer.slice(offset, offset + length * 2);
        const newBuffer = slice.buffer.slice(slice.byteOffset, slice.byteOffset + slice.byteLength);
        return new Int16Array(newBuffer);
      }
      // For Int16Array (16-bit length marker variant)
      case types_default.int16array16: {
        const length = this.readUInt16();
        const offset = this.offset;
        this.offset += length * 2;
        const slice = this.buffer.slice(offset, offset + length * 2);
        const newBuffer = slice.buffer.slice(slice.byteOffset, slice.byteOffset + slice.byteLength);
        return new Int16Array(newBuffer);
      }
      // For Int16Array (32-bit length marker variant)
      case types_default.int16array32: {
        const length = this.readUInt32(dv);
        const offset = this.offset;
        this.offset += length * 2;
        const slice = this.buffer.slice(offset, offset + length * 2);
        const newBuffer = slice.buffer.slice(slice.byteOffset, slice.byteOffset + slice.byteLength);
        return new Int16Array(newBuffer);
      }
      // For Uint16Array (8-bit length marker variant)
      case types_default.uint16array8: {
        const length = this.readUInt8();
        const offset = this.offset;
        this.offset += length * 2;
        const slice = this.buffer.slice(offset, offset + length * 2);
        const newBuffer = slice.buffer.slice(slice.byteOffset, slice.byteOffset + slice.byteLength);
        return new Uint16Array(newBuffer);
      }
      // For Uint16Array (16-bit length marker variant)
      case types_default.uint16array16: {
        const length = this.readUInt16();
        const offset = this.offset;
        this.offset += length * 2;
        const slice = this.buffer.slice(offset, offset + length * 2);
        const newBuffer = slice.buffer.slice(slice.byteOffset, slice.byteOffset + slice.byteLength);
        return new Uint16Array(newBuffer);
      }
      // For Uint16Array (32-bit length marker variant)
      case types_default.uint16array32: {
        const length = this.readUInt32(dv);
        const offset = this.offset;
        this.offset += length * 2;
        const slice = this.buffer.slice(offset, offset + length * 2);
        const newBuffer = slice.buffer.slice(slice.byteOffset, slice.byteOffset + slice.byteLength);
        return new Uint16Array(newBuffer);
      }
      // For Int32Array (8-bit length marker variant)
      case types_default.int32array8: {
        const length = this.readUInt8();
        const offset = this.offset;
        this.offset += length * 4;
        const slice = this.buffer.slice(offset, offset + length * 4);
        const newBuffer = slice.buffer.slice(slice.byteOffset, slice.byteOffset + slice.byteLength);
        return new Int32Array(newBuffer);
      }
      // For Int32Array (16-bit length marker variant)
      case types_default.int32array16: {
        const length = this.readUInt16();
        const offset = this.offset;
        this.offset += length * 4;
        const slice = this.buffer.slice(offset, offset + length * 4);
        const newBuffer = slice.buffer.slice(slice.byteOffset, slice.byteOffset + slice.byteLength);
        return new Int32Array(newBuffer);
      }
      // For Int32Array (32-bit length marker variant)
      case types_default.int32array32: {
        const length = this.readUInt32(dv);
        const offset = this.offset;
        this.offset += length * 4;
        const slice = this.buffer.slice(offset, offset + length * 4);
        const newBuffer = slice.buffer.slice(slice.byteOffset, slice.byteOffset + slice.byteLength);
        return new Int32Array(newBuffer);
      }
      // For Uint32Array (8-bit length marker variant)
      case types_default.uint32array8: {
        const length = this.readUInt8();
        const offset = this.offset;
        this.offset += length * 4;
        const slice = this.buffer.slice(offset, offset + length * 4);
        const newBuffer = slice.buffer.slice(slice.byteOffset, slice.byteOffset + slice.byteLength);
        return new Uint32Array(newBuffer);
      }
      // For Uint32Array (16-bit length marker variant)
      case types_default.uint32array16: {
        const length = this.readUInt16();
        const offset = this.offset;
        this.offset += length * 4;
        const slice = this.buffer.slice(offset, offset + length * 4);
        const newBuffer = slice.buffer.slice(slice.byteOffset, slice.byteOffset + slice.byteLength);
        return new Uint32Array(newBuffer);
      }
      // For Uint32Array (32-bit length marker variant)
      case types_default.uint32array32: {
        const length = this.readUInt32(dv);
        const offset = this.offset;
        this.offset += length * 4;
        const slice = this.buffer.slice(offset, offset + length * 4);
        const newBuffer = slice.buffer.slice(slice.byteOffset, slice.byteOffset + slice.byteLength);
        return new Uint32Array(newBuffer);
      }
      // For Float32Array (8-bit length marker variant)
      case types_default.float32array8: {
        const length = this.readUInt8();
        const offset = this.offset;
        this.offset += length * 4;
        const slice = this.buffer.slice(offset, offset + length * 4);
        const newBuffer = slice.buffer.slice(slice.byteOffset, slice.byteOffset + slice.byteLength);
        return new Float32Array(newBuffer);
      }
      // For Float32Array (16-bit length marker variant)
      case types_default.float32array16: {
        const length = this.readUInt16();
        const offset = this.offset;
        this.offset += length * 4;
        const slice = this.buffer.slice(offset, offset + length * 4);
        const newBuffer = slice.buffer.slice(slice.byteOffset, slice.byteOffset + slice.byteLength);
        return new Float32Array(newBuffer);
      }
      // For Float32Array (32-bit length marker variant)
      case types_default.float32array32: {
        const length = this.readUInt32(dv);
        const offset = this.offset;
        this.offset += length * 4;
        const slice = this.buffer.slice(offset, offset + length * 4);
        const newBuffer = slice.buffer.slice(slice.byteOffset, slice.byteOffset + slice.byteLength);
        return new Float32Array(newBuffer);
      }
      // For Float64Array (8-bit length marker variant)
      case types_default.float64array8: {
        const length = this.readUInt8();
        const offset = this.offset;
        this.offset += length * 8;
        const slice = this.buffer.slice(offset, offset + length * 8);
        const newBuffer = slice.buffer.slice(slice.byteOffset, slice.byteOffset + slice.byteLength);
        return new Float64Array(newBuffer);
      }
      // For Float64Array (16-bit length marker variant)
      case types_default.float64array16: {
        const length = this.readUInt16();
        const offset = this.offset;
        this.offset += length * 8;
        const slice = this.buffer.slice(offset, offset + length * 8);
        const newBuffer = slice.buffer.slice(slice.byteOffset, slice.byteOffset + slice.byteLength);
        return new Float64Array(newBuffer);
      }
      // For Float64Array (32-bit length marker variant)
      case types_default.float64array32: {
        const length = this.readUInt32(dv);
        const offset = this.offset;
        this.offset += length * 8;
        const slice = this.buffer.slice(offset, offset + length * 8);
        const newBuffer = slice.buffer.slice(slice.byteOffset, slice.byteOffset + slice.byteLength);
        return new Float64Array(newBuffer);
      }
      // For BigInt64Array (8-bit length marker variant)
      case types_default.bigint64array8: {
        const length = this.readUInt8();
        const offset = this.offset;
        this.offset += length * 8;
        const slice = this.buffer.slice(offset, offset + length * 8);
        const newBuffer = slice.buffer.slice(slice.byteOffset, slice.byteOffset + slice.byteLength);
        return new BigInt64Array(newBuffer);
      }
      // For BigInt64Array (16-bit length marker variant)
      case types_default.bigint64array16: {
        const length = this.readUInt16();
        const offset = this.offset;
        this.offset += length * 8;
        const slice = this.buffer.slice(offset, offset + length * 8);
        const newBuffer = slice.buffer.slice(slice.byteOffset, slice.byteOffset + slice.byteLength);
        return new BigInt64Array(newBuffer);
      }
      // For BigInt64Array (32-bit length marker variant)
      case types_default.bigint64array32: {
        const length = this.readUInt32(dv);
        const offset = this.offset;
        this.offset += length * 8;
        const slice = this.buffer.slice(offset, offset + length * 8);
        const newBuffer = slice.buffer.slice(slice.byteOffset, slice.byteOffset + slice.byteLength);
        return new BigInt64Array(newBuffer);
      }
      // For BigUint64Array (8-bit length marker variant)
      case types_default.biguint64array8: {
        const length = this.readUInt8();
        const offset = this.offset;
        this.offset += length * 8;
        const slice = this.buffer.slice(offset, offset + length * 8);
        const newBuffer = slice.buffer.slice(slice.byteOffset, slice.byteOffset + slice.byteLength);
        return new BigUint64Array(newBuffer);
      }
      // For BigUint64Array (16-bit length marker variant)
      case types_default.biguint64array16: {
        const length = this.readUInt16();
        const offset = this.offset;
        this.offset += length * 8;
        const slice = this.buffer.slice(offset, offset + length * 8);
        const newBuffer = slice.buffer.slice(slice.byteOffset, slice.byteOffset + slice.byteLength);
        return new BigUint64Array(newBuffer);
      }
      // For BigUint64Array (32-bit length marker variant)
      case types_default.biguint64array32: {
        const length = this.readUInt32(dv);
        const offset = this.offset;
        this.offset += length * 8;
        const slice = this.buffer.slice(offset, offset + length * 8);
        const newBuffer = slice.buffer.slice(slice.byteOffset, slice.byteOffset + slice.byteLength);
        return new BigUint64Array(newBuffer);
      }
      case types_default.date: {
        return new Date(this.readDouble(dv));
      }
      case types_default.regexp: {
        const encodedFlags = this.readUInt8();
        const source = this.readBlock(dv);
        const flags = encodedFlagsLookup[encodedFlags];
        return new RegExp(source, flags);
      }
      case types_default.oref8: {
        const key = this.readUInt8();
        return this.objectRefMap.get(key);
      }
      case types_default.oref16: {
        const key = this.readUInt16();
        return this.objectRefMap.get(key);
      }
      case types_default.oref32: {
        const key = this.readUInt32(dv);
        return this.objectRefMap.get(key);
      }
      case types_default.onull: {
        return /* @__PURE__ */ Object.create(null);
      }
      case types_default.onumber: {
        return Number(this.readBlock(dv));
      }
      case types_default.ostring: {
        return String(this.readBlock(dv));
      }
      case types_default.otrue: {
        return Boolean(true);
      }
      case types_default.ofalse: {
        return Boolean(false);
      }
      default:
        throw `Unsupported type: ${blockType}`;
    }
  }
  readUInt8() {
    return this.buffer[this.offset++];
  }
  readUInt16() {
    return this.buffer[this.offset++] + (this.buffer[this.offset++] << 8);
  }
  readUInt32(dv) {
    const value = dv.getUint32(this.offset, true);
    this.offset += 4;
    return value;
  }
  readInt8(dv) {
    const value = dv.getInt8(this.offset);
    this.offset += 1;
    return value;
  }
  readInt16(dv) {
    const value = dv.getInt16(this.offset, true);
    this.offset += 2;
    return value;
  }
  readInt32(dv) {
    const value = dv.getInt32(this.offset, true);
    this.offset += 4;
    return value;
  }
  readBigInt64(dv) {
    const value = dv.getBigInt64(this.offset, true);
    this.offset += 8;
    return value;
  }
  readBigUInt64(dv) {
    const value = dv.getBigUint64(this.offset, true);
    this.offset += 8;
    return value;
  }
  readDouble(dv) {
    const value = dv.getFloat64(this.offset, true);
    this.offset += 8;
    return value;
  }
  readString(length) {
    const slice = this.buffer.subarray(this.offset, this.offset + length);
    this.offset += length;
    return textDecoder.decode(slice);
  }
};
var sia_default = {
  serialize(obj) {
    return new SiaSerializer().serialize(obj);
  },
  deserialize(obj) {
    return new SiaSerializer().deserialize(obj);
  }
};

// src/utils/index.ts
function deepCopy(obj, mode = "json") {
  switch (mode) {
    case "sia":
      return sia_default.deserialize(sia_default.serialize(obj));
    default:
      return json_default.deserialize(json_default.serialize(obj));
  }
}
function isPublisher(obj) {
  return obj && typeof obj.subscribe === "function";
}
function combine(sink, generator) {
  return new class CombinedPublisher extends BackpressurePublisher {
    subscribe(subscriber) {
      const gen = generator(sink);
      const sub = super.subscribe(subscriber);
      return {
        request(count) {
          sub.request(count);
          gen?.request(count);
        },
        unsubscribe() {
          sub.unsubscribe();
          gen?.unsubscribe();
        }
      };
    }
  }(sink);
}

// src/utils/peek/index.ts
function peek(obj) {
  return {
    map(fn) {
      return peek(fn(obj));
    },
    flatMap(fn) {
      return fn(obj);
    },
    peek(fn) {
      fn(obj);
      return this;
    },
    get() {
      return obj;
    }
  };
}
function lazyPeek(fn) {
  const res = fn(() => res);
  return peek(res);
}

// src/publishers/flux/index.ts
var Flux = class _Flux extends AbstractPipePublisher {
  constructor(publisher) {
    super(publisher);
  }
  sinkType() {
    return "many";
  }
  /**
   * Возвращает первый элемент потока как Mono.
   */
  first() {
    return Mono.generate((sink) => {
      let sub;
      (sub = this.subscribe({
        onNext(value) {
          sink.next(value);
          sub?.unsubscribe();
        },
        onError(error) {
          sink.error(error);
        },
        onComplete() {
          sink.complete();
        }
      })).request(Number.MAX_SAFE_INTEGER);
    });
  }
  /**
   * Возвращает последний элемент потока как Mono.
   */
  last() {
    return Mono.generate((sink) => {
      let lastValue;
      this.subscribe({
        onNext(value) {
          lastValue = value;
        },
        onError: sink.error,
        onComplete() {
          if (lastValue !== void 0) sink.next(lastValue);
          else sink.complete();
        }
      }).request(Number.MAX_SAFE_INTEGER);
    });
  }
  /**
   * Возвращает количество элементов в потоке.
   */
  count() {
    return this.collect().map((value) => value.length);
  }
  /**
   * Проверяет наличие хотя бы одного элемента.
   */
  hasElements() {
    return this.count().map((value) => value > 0);
  }
  /**
   * Собирает все элементы в массив и возвращает как Mono<T[]>.
   */
  collect(force = false) {
    return Mono.generate((sink) => {
      const buffer = [];
      peek(this.subscribe({
        onNext(value) {
          buffer.push(value);
        },
        onError(error) {
          sink.error(error);
        },
        onComplete() {
          sink.next(buffer);
        }
      })).peek((s) => s.request(Number.MAX_SAFE_INTEGER)).peek((s) => {
        if (force) new MicroScheduler().schedule(() => {
          try {
            sink.next(buffer);
          } catch (e) {
          }
          s.unsubscribe();
        });
      });
    });
  }
  /**
   * Индексирует элементы потока: [index, value].
   */
  indexed() {
    let pipeSub;
    return this.pipe((onNext, onError, onComplete) => {
      let index = 0;
      pipeSub = this.subscribe({
        onNext(value) {
          onNext([index++, value]);
        },
        onError,
        onComplete
      });
    }, void 0, (request) => pipeSub?.request(request), () => pipeSub?.unsubscribe());
  }
  skip(n) {
    return this.indexed().filter((value) => value[0] >= n).map((value) => value[1]);
  }
  skipWhile(predicate) {
    let pipeSub;
    return this.pipe((onNext, onError, onComplete) => {
      let skipping = true;
      pipeSub = this.subscribe({
        onNext(value) {
          if (!skipping || !predicate(value)) {
            skipping = false;
            onNext(value);
          } else onNext(null);
        },
        onError,
        onComplete
      });
    }, void 0, (request) => pipeSub?.request(request), () => pipeSub?.unsubscribe());
  }
  skipUntil(other) {
    let pipeSub;
    return this.pipe((onNext, onError, onComplete) => {
      let open = false;
      const sub = this.subscribe({
        onNext: (value) => {
          if (open) onNext(value);
          else onNext(null);
        },
        onError,
        onComplete
      });
      const sub2 = other.subscribe({
        onNext(value) {
          open = true;
        },
        onError,
        onComplete() {
        }
      });
      pipeSub = {
        request(count) {
          sub.request(count);
          sub2.request(count);
        },
        unsubscribe() {
          sub.unsubscribe();
          sub2.unsubscribe();
        }
      };
    }, void 0, (request) => pipeSub?.request(request), () => pipeSub?.unsubscribe());
  }
  distinct() {
    let sub;
    return this.pipe((onNext, onError, onComplete) => {
      const seen = /* @__PURE__ */ new Set();
      sub = this.subscribe({
        onNext: (value) => {
          if (!seen.has(value)) {
            seen.add(value);
            onNext(value);
          } else onNext(null);
        },
        onError,
        onComplete
      });
    }, void 0, (request) => sub?.request(request), () => sub?.unsubscribe());
  }
  distinctUntilChanged(deep = true) {
    let sub;
    return this.pipe((onNext, onError, onComplete) => {
      let lastEmitted = null;
      sub = this.subscribe({
        onNext(value) {
          let val = value;
          if (deep) {
            try {
              val = json_default.serialize(value);
            } catch (e) {
              onError(e);
              return;
            }
          }
          if (lastEmitted != val) {
            lastEmitted = val;
            onNext(value);
          } else onNext(null);
        },
        onError(error) {
          onError(error);
        },
        onComplete() {
          onComplete();
        }
      });
    }, void 0, (request) => sub?.request(request), () => sub?.unsubscribe());
  }
  delayElements(ms) {
    let sub;
    return this.pipe((onNext, onError, onComplete) => {
      let promise = Promise.resolve();
      const emit = (fn) => {
        promise = promise.then(() => new Promise((resolve) => {
          new DelayScheduler(ms).schedule(() => {
            fn();
            resolve();
          });
        }));
      };
      sub = this.subscribe({
        onNext(value) {
          emit(() => onNext(value));
        },
        onError(error) {
          emit(() => onError(error));
        },
        onComplete() {
          emit(() => onComplete());
        }
      });
    }, void 0, (request) => sub?.request(request), () => sub?.unsubscribe());
  }
  concatWith(other) {
    let pipeSub;
    return this.pipe((onNext, onError, onComplete) => {
      let second;
      const first = this.subscribe({
        onNext(value) {
          onNext(value);
        },
        onError(error) {
          onError(error);
        },
        onComplete() {
          second = other.subscribe({
            onNext,
            onError,
            onComplete
          });
        }
      });
      pipeSub = {
        request(count) {
          first.request(count);
          second?.request(count);
        },
        unsubscribe() {
          first.unsubscribe();
          second?.unsubscribe();
        }
      };
    }, void 0, (request) => pipeSub?.request(request), () => pipeSub?.unsubscribe());
  }
  mergeWith(other) {
    let pipeSub;
    return this.pipe((onNext, onError, onComplete) => {
      let left = 2;
      const subscriber = {
        onNext,
        onError,
        onComplete() {
          if (--left <= 0) {
            onComplete();
          }
        }
      };
      const first = this.subscribe(subscriber);
      const second = other.subscribe(subscriber);
      pipeSub = {
        request(count) {
          first.request(count);
          second.request(count);
        },
        unsubscribe() {
          first.unsubscribe();
          second.unsubscribe();
        }
      };
    }, void 0, (request) => pipeSub?.request(request), () => pipeSub?.unsubscribe());
  }
  reduce(reducer) {
    return this.collect().map((value) => value.reduce(reducer));
  }
  reduceWith(seedFactory, reducer) {
    return Mono.generate((sink) => {
      let acc = seedFactory();
      this.subscribe({
        onNext(value) {
          acc = reducer(acc, value);
        },
        onError(error) {
          sink.error(error);
        },
        onComplete() {
          sink.next(acc);
        }
      }).request(Number.MAX_SAFE_INTEGER);
    });
  }
  then() {
    return Mono.generate((sink) => {
      this.subscribe({
        onNext(value) {
        },
        onError(error) {
          sink.error(error);
        },
        onComplete() {
          sink.complete();
        }
      }).request(Number.MAX_SAFE_INTEGER);
    });
  }
  thenEmpty(other) {
    return Mono.generate((sink) => {
      this.subscribe({
        onNext(value) {
        },
        onError(error) {
          sink.error(error);
        },
        onComplete() {
          other.subscribe({
            onNext(value) {
            },
            onError(error) {
              sink.error(error);
            },
            onComplete() {
              sink.complete();
            }
          }).request(Number.MAX_SAFE_INTEGER);
        }
      }).request(Number.MAX_SAFE_INTEGER);
    });
  }
  // =========================================================================
  // =                            СТАТИЧЕСКИЕ МЕТОДЫ                         =
  // =========================================================================
  static from(publisher) {
    return _Flux.generate((sink) => {
      return publisher.subscribe({
        onNext(value) {
          sink.next(value);
        },
        onError(error) {
          sink.error(error);
        },
        onComplete() {
          sink.complete();
        }
      });
    });
  }
  static generate(generator) {
    return new _Flux(combine(new ManySink(), generator));
  }
  static fromIterable(iterable) {
    return _Flux.generate((sink) => {
      for (const value of iterable) {
        sink.next(value);
      }
      sink.complete();
    });
  }
  static range(start, count) {
    return _Flux.generate((sink) => {
      let current = start;
      for (let i = 0; i < count; i++) {
        sink.next(current++);
      }
      sink.complete();
    });
  }
  static empty() {
    return _Flux.generate((sink) => {
      sink.complete();
    });
  }
  static defer(factory) {
    return _Flux.generate((sink) => factory().subscribe({
      onNext(value) {
        sink.next(value);
      },
      onError(error) {
        sink.error(error);
      },
      onComplete() {
        sink.complete();
      }
    }));
  }
  subscribe({
    onNext = (value) => {
    },
    onError = (error) => {
    },
    onComplete = () => {
    }
  } = {}) {
    return this.publisher.subscribe({ onNext, onError, onComplete });
  }
  pipe(producer, onSubscribe, onRequest, onUnsubscribe) {
    return super.pipe(producer, onSubscribe, onRequest, onUnsubscribe);
  }
  map(fn) {
    return super.map(fn);
  }
  mapNotNull(fn) {
    return super.mapNotNull(fn);
  }
  flatMap(fn) {
    return super.flatMap(fn);
  }
  filter(predicate) {
    return super.filter(predicate);
  }
  filterWhen(predicate) {
    return super.filterWhen(predicate);
  }
  cast() {
    return super.cast();
  }
  switchIfEmpty(alternative) {
    return super.switchIfEmpty(alternative);
  }
  onErrorReturn(replacement) {
    return super.onErrorReturn(replacement);
  }
  onErrorContinue(predicate) {
    return super.onErrorContinue(predicate);
  }
  doFirst(fn) {
    return super.doFirst(fn);
  }
  doOnNext(fn) {
    return super.doOnNext(fn);
  }
  doFinally(fn) {
    return super.doFinally(fn);
  }
  doOnSubscribe(fn) {
    return super.doOnSubscribe(fn);
  }
  publishOn(scheduler) {
    return super.publishOn(scheduler);
  }
  subscribeOn(scheduler) {
    return super.subscribeOn(scheduler);
  }
};

// src/publishers/mono/index.ts
var Mono = class _Mono extends AbstractPipePublisher {
  constructor(publisher) {
    super(publisher);
  }
  /**
   * Подписывает подписчика на обёрнутый Publisher.
   */
  subscribe({
    onNext = (value) => {
    },
    onError = (error) => {
    },
    onComplete = () => {
    }
  } = {}) {
    return peek(this.publisher.subscribe({ onNext, onError, onComplete })).peek((val) => val.request(1)).get();
  }
  sinkType() {
    return "one";
  }
  // =========================================================================
  // =                            Статические фабрики                        =
  // =========================================================================
  static from(publisher) {
    return _Mono.generate(
      (sink) => lazyPeek((self) => publisher.subscribe({
        onNext(value) {
          sink.next(value);
          self().unsubscribe();
        },
        onError(error) {
          sink.error(error);
          self().unsubscribe();
        },
        onComplete() {
          sink.complete();
          self().unsubscribe();
        }
      })).get()
    );
  }
  static generate(generator) {
    return new _Mono(combine(new OneSink(), generator));
  }
  /**
   * Возвращает Mono, испускающий одно значение и завершающийся.
   *
   * @example
   * Mono.just(42).subscribe(...)
   */
  static just(value) {
    return _Mono.generate((sink) => sink.next(value));
  }
  /**
   * Возвращает пустой Mono (только onComplete).
   *
   * @example
   * Mono.empty().subscribe(...)
   */
  static empty() {
    return _Mono.generate((sink) => sink.complete());
  }
  /**
   * Возвращает Mono, испускающий только ошибку.
   *
   * @example
   * Mono.error(new Error("Oops")).subscribe(...)
   */
  static error(error) {
    return _Mono.generate((sink) => sink.error(error));
  }
  /**
   * Возвращает Mono.just(value), если value != null, иначе Mono.empty().
   *
   * @example
   * Mono.justOrEmpty(null) → Mono.empty()
   */
  static justOrEmpty(value) {
    return value == null ? _Mono.empty() : _Mono.just(value);
  }
  /**
   * Преобразует Promise в Mono.
   *
   * - resolve → onNext(value), onComplete
   * - reject → onError(error)
   *
   * @example
   * Mono.fromPromise(fetch(...)).subscribe(...)
   */
  static fromPromise(promise) {
    return _Mono.generate((sink) => promise.then((value) => sink.next(value)).catch((err) => sink.error(err)));
  }
  /**
   * Создаёт Mono, который инициализируется лениво при подписке.
   *
   * @example
   * Mono.defer(() => Mono.just(Date.now()))
   */
  static defer(factory) {
    return _Mono.generate((sink) => factory().subscribe({
      onNext(value) {
        sink.next(value);
      },
      onError(error) {
        sink.error(error);
      },
      onComplete() {
        sink.complete();
      }
    }));
  }
  // =========================================================================
  // =                             INSTANCE-МЕТОДЫ                            =
  // =========================================================================
  /**
   * Преобразует Mono<T> в Flux<R> через маппер.
   */
  flatMapMany(mapper) {
    return Flux.generate((sink) => {
      let subscription;
      this.subscribe({
        onNext: (val) => {
          subscription = mapper(val).subscribe({
            onNext(value) {
              sink.next(value);
            },
            onError(error) {
              sink.error(error);
            },
            onComplete() {
              sink.complete();
            }
          });
        },
        onError: (error) => {
          sink.error(error);
        },
        onComplete: () => {
          if (subscription == null) sink.complete();
        }
      });
      return {
        request(count) {
          subscription?.request(count);
        },
        unsubscribe() {
          subscription?.unsubscribe();
        }
      };
    });
  }
  /**
   * Объединяет два Mono в Mono<[T, R]>.
   */
  zipWith(other) {
    return this.flatMap((left) => other.map((right) => [left, right]));
  }
  /**
   * Комбинирует Mono<T> с результатом fn(value): Mono<R>.
   */
  zipWhen(fn) {
    return this.flatMap((left) => fn(left).map((right) => [left, right]));
  }
  /**
   * Проверяет, содержит ли Mono значение.
   */
  hasElement() {
    return this.onErrorContinue((_error) => true).map((_value) => true).switchIfEmpty(_Mono.defer(() => _Mono.just(false)));
  }
  /**
   * Преобразует Mono<T> в Promise<T | null>.
   */
  toPromise() {
    return new Promise((resolve, reject) => {
      let value = null;
      this.subscribe({
        onNext: (v) => value = v,
        onError: reject,
        onComplete: () => resolve(value)
      });
    });
  }
  pipe(producer, onSubscribe, onRequest, onUnsubscribe) {
    return super.pipe(producer, onSubscribe, onRequest, onUnsubscribe);
  }
  map(fn) {
    return super.map(fn);
  }
  mapNotNull(fn) {
    return super.mapNotNull(fn);
  }
  flatMap(fn) {
    return super.flatMap(fn);
  }
  filter(predicate) {
    return super.filter(predicate);
  }
  filterWhen(predicate) {
    return super.filterWhen(predicate);
  }
  cast() {
    return super.cast();
  }
  switchIfEmpty(alternative) {
    return super.switchIfEmpty(alternative);
  }
  onErrorReturn(replacement) {
    return super.onErrorReturn(replacement);
  }
  onErrorContinue(predicate) {
    return super.onErrorContinue(predicate);
  }
  doFirst(fn) {
    return super.doFirst(fn);
  }
  doOnNext(fn) {
    return super.doOnNext(fn);
  }
  doFinally(fn) {
    return super.doFinally(fn);
  }
  doOnSubscribe(fn) {
    return super.doOnSubscribe(fn);
  }
  publishOn(scheduler) {
    return super.publishOn(scheduler);
  }
  subscribeOn(scheduler) {
    return super.subscribeOn(scheduler);
  }
};

// src/serializers/base64/index.ts
var import_js_base64 = require("js-base64");
var base64_default = {
  serialize(obj) {
    return (0, import_js_base64.encode)(obj);
  },
  deserialize(obj) {
    return (0, import_js_base64.decode)(obj);
  }
};

// src/serializers/stringify/index.ts
var stringify_default = {
  serialize(obj) {
    return base64_default.serialize(sia_default.serialize(obj).join(","));
  },
  deserialize(obj) {
    return sia_default.deserialize(Uint8Array.from(base64_default.deserialize(obj).split(",")));
  }
};

// src/serializers/rc4/index.ts
var rc4_default = new class Rc4 {
  serialize(data, secret = "rc4") {
    let i;
    const s = [];
    let j = 0;
    let x;
    let res = "";
    for (i = 0; i < 256; i++) {
      s[i] = i;
    }
    for (i = 0; i < 256; i++) {
      j = (j + s[i] + secret.charCodeAt(i % secret.length)) % 256;
      x = s[i];
      s[i] = s[j];
      s[j] = x;
    }
    i = 0;
    j = 0;
    for (let y = 0; y < data.length; y++) {
      i = (i + 1) % 256;
      j = (j + s[i]) % 256;
      x = s[i];
      s[i] = s[j];
      s[j] = x;
      res += String.fromCharCode(data.charCodeAt(y) ^ s[(s[i] + s[j]) % 256]);
    }
    return res;
  }
  deserialize(data, secret = "rc4") {
    return this.serialize(data, secret);
  }
}();

// src/cache/index.ts
var CacheBuilder = class {
  constructor() {
    this._encode = false;
    this._storage = "memory";
    this._maxSize = -1;
    this._overflowPolicy = "overwrite";
    this._expireAfterAccess = -1;
    this._expireAfterWrite = -1;
  }
  name(value) {
    this._name = value;
    return this;
  }
  encode(value) {
    this._encode = value;
    return this;
  }
  storage(value) {
    this._storage = value;
    return this;
  }
  maxSize(value) {
    this._maxSize = value;
    return this;
  }
  overflowPolicy(value) {
    this._overflowPolicy = value;
    return this;
  }
  expireAfterAccess(value) {
    this._expireAfterAccess = value;
    return this;
  }
  expireAfterWrite(value) {
    this._expireAfterWrite = value;
    return this;
  }
  onRemove(value) {
    this._onRemove = value;
    return this;
  }
  buildOptions() {
    return {
      name: this._name,
      encode: this._encode,
      storage: this._storage,
      maxSize: this._maxSize,
      overflowPolicy: this._overflowPolicy,
      expireAfterAccess: this._expireAfterAccess,
      expireAfterWrite: this._expireAfterWrite,
      onRemove: this._onRemove
    };
  }
  build() {
    return new Cache(this.buildOptions());
  }
};
var Cache = class {
  constructor(options) {
    this.options = options;
    this.cache = /* @__PURE__ */ new Map();
    this.initialize();
  }
  initialize() {
    const storageType = this.options.storage;
    if (storageType == "memory" || window == null) return;
    const name = this.options.name;
    if (name == null) throw new Error("Stores other than memory require an explicit name");
    window.addEventListener("beforeunload", this.save);
    const storage = window[`${storageType}Storage`];
    const encode2 = this.options.encode;
    const stored = storage.getItem(encode2 ? rc4_default.serialize(name, name) : name);
    if (stored == null) return;
    const decoded = encode2 ? stringify_default.deserialize(stored) : json_default.deserialize(stored);
    decoded.forEach((value, key) => {
      if (value.expire == -1 || value.expire > Date.now()) {
        this.cache.set(key, value);
      }
    });
  }
  save() {
    const name = this.options.name;
    const storageType = this.options.storage;
    if (storageType == "memory" || window == null || name == null) return;
    const storage = window[`${storageType}Storage`];
    const encode2 = this.options.encode;
    storage.setItem(
      encode2 ? rc4_default.serialize(name, name) : name,
      encode2 ? stringify_default.serialize(this.cache) : json_default.serialize(this.cache)
    );
  }
  get(key, factory) {
    return this.getIfPresent(key) || this.put(key, factory(key));
  }
  getIfPresent(key) {
    let stored = this.cache.get(key);
    if (stored != null && stored.expire > -1 && stored.expire >= Date.now()) {
      if (this.options.expireAfterAccess > -1) stored.expire = Date.now() + this.options.expireAfterAccess;
      return stored.value;
    }
    this.invalidate(key, "expire");
    return null;
  }
  put(key, value) {
    if (this.options.maxSize > -1 && this.cache.size >= this.options.maxSize) {
      const overflowPolicy = this.options.overflowPolicy;
      if (overflowPolicy == "ignore") return value;
      if (overflowPolicy == "error") throw new Error("Cache overflowed!");
      if (overflowPolicy == "overwrite") this.invalidate(this.cache.keys().next().value, "eviction");
    }
    this.cache.set(key, {
      value,
      expire: this.options.expireAfterWrite > -1 ? Date.now() + this.options.expireAfterWrite : -1
    });
    return value;
  }
  invalidate(key, reason = "manual") {
    if (key == null || !this.cache.has(key)) return;
    const value = this.cache.get(key);
    this.cache.delete(key);
    if (value == null) return;
    this.options.onRemove?.(key, value.value, reason);
  }
  invalidateAll() {
    const keys = this.cache.keys();
    let next = keys.next();
    while (!next.done) {
      this.invalidate(next.value);
      next = keys.next();
    }
  }
};
var cache_default = {
  builder: () => new CacheBuilder()
};

// src/eventbus/priority/index.ts
var EventPriority = /* @__PURE__ */ ((EventPriority2) => {
  EventPriority2[EventPriority2["LOWEST"] = 0] = "LOWEST";
  EventPriority2[EventPriority2["LOW"] = 1] = "LOW";
  EventPriority2[EventPriority2["NORMAL"] = 2] = "NORMAL";
  EventPriority2[EventPriority2["HIGH"] = 3] = "HIGH";
  EventPriority2[EventPriority2["HIGHEST"] = 4] = "HIGHEST";
  return EventPriority2;
})(EventPriority || {});
var priority_default = EventPriority;

// src/eventbus/index.ts
var EventBusContainer = class {
  constructor() {
    this.sink = new ManySink();
  }
  emit(event, data) {
    const instance = new event(data);
    Object.keys(priority_default).filter((value) => isNaN(value)).forEach((value) => {
      this.sink.next({
        event: instance,
        priority: value
      });
    });
    return instance;
  }
  on(event, callback, priority = priority_default.NORMAL, ignoreCanceled = false) {
    const subscription = Flux.from(this.sink).cast().filter((value) => value.event instanceof event).filter((value) => value.priority == priority_default[priority]).filter((value) => ignoreCanceled || !value.event.canceled).doOnNext((value) => callback(value.event)).subscribe();
    subscription.request(Number.MAX_SAFE_INTEGER);
    return {
      detach() {
        subscription.unsubscribe();
      }
    };
  }
};
var eventbus_default = new EventBusContainer();

// src/eventbus/event/index.ts
var EventBusEvent = class {
  constructor(data) {
    this.data = data;
    this.canceled = false;
  }
};

// src/utils/reactive/index.ts
var Reactive = class {
  constructor(value) {
    this.sink = new ReplayLatestSink(1);
    this.next(value);
  }
  next(value) {
    this.ref = value;
    this.sink.next(value);
    return this;
  }
  update(fn) {
    return this.next(fn(this.ref));
  }
  get() {
    return this.ref;
  }
  subscribe({
    onNext = (value) => {
    },
    onError = (error) => {
    },
    onComplete = () => {
    }
  } = {}) {
    return peek(this.asFlux().subscribe({
      onNext,
      onError,
      onComplete
    })).peek((val) => val.request(Number.MAX_SAFE_INTEGER)).get();
  }
  asFlux() {
    return Flux.from(this.sink).cast().distinctUntilChanged();
  }
};
function reactive(value) {
  if (value instanceof Reactive) return value;
  return new Reactive(value);
}

// src/index.ts
var Sinks = {
  one: () => new OneSink(),
  many: () => ({
    multicast: () => new ManySink(),
    replay: () => ({
      all: () => new ReplayAllSink(),
      latest: (limit) => new ReplayLatestSink(limit),
      limit: (limit) => new ReplayLimitSink(limit)
    })
  })
};
var Schedulers = {
  immediate: () => new ImmediateScheduler(),
  micro: () => new MicroScheduler(),
  macro: () => new MacroScheduler(),
  delay: (ms) => new DelayScheduler(ms)
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  AbstractPipePublisher,
  BackpressurePublisher,
  Base64,
  Cache,
  DelayScheduler,
  Event,
  EventBus,
  EventBusContainer,
  EventBusEvent,
  EventPriority,
  Flux,
  ImmediateScheduler,
  Json,
  MacroScheduler,
  ManySink,
  MicroScheduler,
  Mono,
  OneSink,
  Rc4,
  Reactive,
  ReplayAllSink,
  ReplayLatestSink,
  ReplayLimitSink,
  Schedulers,
  Sia,
  Sinks,
  Stringify,
  combine,
  deepCopy,
  isPublisher,
  lazyPeek,
  peek,
  reactive
});
//# sourceMappingURL=index.js.map