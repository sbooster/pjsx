import Sink from "@/sink/Sink";
import OneSink from "@/sink/one/OneSink";
import ManySink from "@/sink/many/ManySink";
import {ReplayLatestSink, ReplayLimitSink, ReplyAllSink} from "@/sink/many/reply/ReplySink";
import UnicastSink from "@/sink/many/unicast/UnicastSink";

/**
 * Этот модуль предоставляет фабрику для создания различных типов Sinks:
 * - `one` — для единственного эмита.
 * - `many` — для множественных эмитов с различными вариантами обработки слушателей.
 */
export default {
    /**
     * Создаёт Sink, который поддерживает только один эмит (значение или ошибка).
     * После первого эмита Sink закрывается, и все вызовы emit будут игнорироваться.
     * Поддерживается только один слушатель.
     *
     * @returns {Sink<T>} Экземпляр `OneSink`.
     */
    one: <T>(): Sink<T> => {
        return new OneSink<T>();
    },
    /**
     * Возвращают фабрику для Sinks, которые поддерживают множественные эмиты.
     * Эти Sinks предоставляют различные варианты взаимодействия со слушателями.
     */
    many: () => {
        return {
            /**
             * Создаёт Sink с поддержкой множества слушателей.
             * Каждый новый эмит отправляется всем текущим слушателям, но
             * прошлые эмиты не сохраняются и не отправляются новым слушателям.
             *
             * @returns {ManySink<T>} Экземпляр `ManySink`.
             */
            multicast: <T>(): Sink<T> => {
                return new ManySink<T>();
            },
            /**
             * Возвращают фабрику для Sinks способных воспроизводить доставку прошлых эмитов новым слушателям.
             */
            replay: () => {
                return {
                    /**
                     * Создаёт Sink, который повторяет все прошлые эмиты для новых слушателей.
                     * Все текущие слушатели получают новые эмиты в реальном времени.
                     *
                     * @returns {ReplyAllSink<T>} Экземпляр `ReplyAllSink`.
                     */
                    all: <T>(): Sink<T> => {
                        return new ReplyAllSink();
                    },
                    /**
                     * Создаёт Sink, который повторяет только ПОСЛЕДНИЕ `count` эмитов новым слушателям.
                     * Все текущие слушатели получают новые эмиты в реальном времени.
                     *
                     * @param count Количество последних эмитов, которые будут воспроизведены новым слушателям.
                     * @returns {ReplayLatestSink<T>} Экземпляр `ReplayLatestSink`.
                     */
                    latest: <T>(count: number): Sink<T> => {
                        return new ReplayLatestSink(count);
                    },
                    /**
                     * Создаёт Sink, который повторяет только ПЕРВЫЕ `count` эмитов новым слушателям.
                     * Все текущие слушатели получают новые эмиты в реальном времени.
                     *
                     * @param count Количество первых эмитов, которые будут воспроизведены новым слушателям.
                     * @returns {ReplayLimitSink<T>} Экземпляр `ReplayLimitSink`.
                     */
                    limit: <T>(count: number): Sink<T> => {
                        return new ReplayLimitSink(count);
                    }
                }

            },
            /**
             * Создаёт Sink, который поддерживает только одного слушателя.
             * Последующие попытки регистрации слушателей будут отклонены.
             *
             * @returns {UnicastSink<T>} Экземпляр `UnicastSink`.
             */
            unicast: <T>(): Sink<T> => {
                return new UnicastSink();
            }
        }
    }
}