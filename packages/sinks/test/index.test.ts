// @ts-ignore
import {Sinks, Signal, Sink} from '@/index';

describe('Sinks.one()', () => {
    test('should close after emit', () => {
        const sink = Sinks.one();
        const listener = jest.fn();
        sink.addListener(listener);
        sink.emitData('value');
        expect(listener).toHaveBeenCalledWith(Signal.DATA, 'value');
        expect(listener).toHaveBeenCalledWith(Signal.CLOSE)
        expect(listener).toHaveBeenCalledTimes(2)
    });
    test('should emit error', () => {
        const sink = Sinks.one();
        const listener = jest.fn();
        sink.addListener(listener);
        let error = new Error("emitted error");
        sink.emitError(error);
        expect(listener).toHaveBeenCalledWith(Signal.ERROR, error);
    });
    test('should error on second listener', () => {
        const sink = Sinks.one();
        sink.addListener(jest.fn())
        expect(() => sink.addListener(jest.fn())).toThrowError("Multiple listeners are not supported by Sinks#one")
    });
    test('should error on emit after close', () => {
        const sink = Sinks.one();
        sink.emitClose()
        expect(() => sink.emitData('value')).toThrowError('Multiple emits are not supported by Sinks#one');
    });
});
const testMultipleEmits = (createSink: <T>() => Sink<T>) => {
    test('should support multiple emits', () => {
        const sink = createSink();
        const listener = jest.fn();
        sink.addListener(listener);
        sink.emitData('first');
        sink.emitData('second');
        expect(listener).toHaveBeenCalledWith(Signal.DATA, 'first');
        expect(listener).toHaveBeenCalledWith(Signal.DATA, 'second');
    });
}
const testEmitsAfterClose = (createSink: <T>() => Sink<T>) => {
    test('should error on emit after close', () => {
        const sink = createSink();
        sink.emitData('value');
        sink.emitClose();
        expect(() => sink.emitData('value')).toThrowError('Emit to a closed Sink#many is not supported.');
    });
}
const testMany = (createSink: <T>() => Sink<T>) => {
    test('should support multiple listeners', () => {
        const sink = createSink();
        const first = jest.fn();
        const second = jest.fn();

        sink.addListener(first);
        sink.addListener(second);
        sink.emitData('value');
        expect(first).toHaveBeenCalledWith(Signal.DATA, 'value');
        expect(second).toHaveBeenCalledWith(Signal.DATA, 'value');
    });
    testMultipleEmits(createSink)
    testEmitsAfterClose(createSink)
}

describe('Sinks.many().multicast()', () => {
    testMany(() => Sinks.many().multicast())
})

describe('Sinks.many().replay()', () => {
    testMany(() => Sinks.many().replay().latest(2))
    testMany(() => Sinks.many().replay().limit(2))
    testMany(() => Sinks.many().replay().all())
    test('should handle latest history in replay sinks', () => {
        const sink = Sinks.many().replay().latest(2);
        const listener = jest.fn();
        sink.emitData('value1');
        sink.emitData('value2');
        sink.emitData('value3');
        sink.addListener(listener);
        expect(listener).toHaveBeenCalledWith(Signal.DATA, 'value2');
        expect(listener).toHaveBeenCalledWith(Signal.DATA, 'value3');
    });
    test('should handle limited history in replay sinks', () => {
        const sink = Sinks.many().replay().limit(2);
        const listener = jest.fn();
        sink.emitData('value1');
        sink.emitData('value2');
        sink.emitData('value3');
        sink.addListener(listener);
        expect(listener).toHaveBeenCalledWith(Signal.DATA, 'value1');
        expect(listener).toHaveBeenCalledWith(Signal.DATA, 'value2');
    });
    test('should handle all history in replay sinks', () => {
        const sink = Sinks.many().replay().all();
        const listener = jest.fn();
        sink.emitData('value1');
        sink.emitData('value2');
        sink.emitData('value3');
        sink.addListener(listener);
        expect(listener).toHaveBeenCalledWith(Signal.DATA, 'value1');
        expect(listener).toHaveBeenCalledWith(Signal.DATA, 'value2');
        expect(listener).toHaveBeenCalledWith(Signal.DATA, 'value3');
    });
})

describe('Sinks.many().unicast()', () => {
    testMultipleEmits(() => Sinks.many().unicast())
    testEmitsAfterClose(() => Sinks.many().unicast())
    test('should error on second listener', () => {
        const sink = Sinks.many().unicast();
        sink.addListener(jest.fn())
        expect(() => sink.addListener(jest.fn())).toThrowError("Multiple listeners are not supported by Sinks#many#unicast")
    });
    test('should throw error when trying to remove listener from unicast', () => {
        const sink = Sinks.many().unicast();
        const listener = jest.fn();
        sink.addListener(listener);
        expect(() => sink.removeListener(listener)).toThrowError('Removing listener are not supported by Sinks#many#unicast');
    });
});
