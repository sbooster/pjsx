import Sink from "@/sink/Sink";
import OneSink from "@/sink/OneSink";
import ManySink from "@/sink/ManySink";
import {ReplayLatestSink, ReplayLimitSink, ReplyAllSink} from "@/sink/ReplySink";
import UnicastSink from "@/sink/UnicastSink";

/**
 * Этот модуль предоставляет фабрику для создания различных типов Sinks:
 * - `one` — для единственного эмита.
 * - `many` — для множественных эмитов с различными вариантами обработки подписчиков.
 */
export default {
    /**
     * Создаёт Sink, который поддерживает только один эмит (значение или ошибка).
     * После первого эмита Sink закрывается, и все вызовы emit будут игнорироваться.
     * Поддерживается только один подписчик.
     *
     * @returns {Sink<T>} Экземпляр `OneSink`.
     */
    one: <T>(): Sink<T> => {
        return new OneSink<T>();
    },
    /**
     * Возвращают фабрику для Sinks, которые поддерживают множественные эмиты.
     * Эти Sinks предоставляют различные варианты взаимодействия с подписчиками.
     */
    many: () => {
        return {
            /**
             * Создаёт Sink с поддержкой множества подписчиков.
             * Каждый новый эмит отправляется всем текущим подписчикам, но
             * прошлые эмиты не сохраняются и не отправляются новым подписчикам.
             *
             * @returns {ManySink<T>} Экземпляр `ManySink`.
             */
            multicast: <T>(): Sink<T> => {
                return new ManySink<T>();
            },
            /**
             * Возвращают фабрику для Sinks способных воспроизводить доставку прошлых эмитов новым подписчикам.
             */
            replay: () => {
                return {
                    /**
                     * Создаёт Sink, который повторяет все прошлые эмиты для новых подписчиков.
                     * Все текущие подписчики получают новые эмиты в реальном времени.
                     *
                     * @returns {ReplyAllSink<T>} Экземпляр `ReplyAllSink`.
                     */
                    all: <T>(): Sink<T> => {
                        return new ReplyAllSink();
                    },
                    /**
                     * Создаёт Sink, который повторяет только ПОСЛЕДНИЕ `count` эмитов новым подписчикам.
                     * Все текущие подписчики получают новые эмиты в реальном времени.
                     *
                     * @param count Количество последних эмитов, которые будут воспроизведены новым подписчикам.
                     * @returns {ReplayLatestSink<T>} Экземпляр `ReplayLatestSink`.
                     */
                    latest: <T>(count: number): Sink<T> => {
                        return new ReplayLatestSink(count);
                    },
                    /**
                     * Создаёт Sink, который повторяет только ПЕРВЫЕ `count` эмитов новым подписчикам.
                     * Все текущие подписчики получают новые эмиты в реальном времени.
                     *
                     * @param count Количество первых эмитов, которые будут воспроизведены новым подписчикам.
                     * @returns {ReplayLimitSink<T>} Экземпляр `ReplayLimitSink`.
                     */
                    limit: <T>(count: number): Sink<T> => {
                        return new ReplayLimitSink(count);
                    }
                }

            },
            /**
             * Создаёт Sink, который поддерживает только одного подписчика.
             * Последующие попытки подписаться будут отклонены.
             *
             * @returns {UnicastSink<T>} Экземпляр `UnicastSink`.
             */
            unicast: <T>(): Sink<T> => {
                return new UnicastSink();
            }
        }
    }
}