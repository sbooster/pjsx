import CorePublisher from "@/publisher/CorePublisher";
import Sinks, {Sink} from "sinks";

export default class Flux<T> extends CorePublisher<T> {
    protected createSink(): Sink<T> {
        return Sinks.many().multicast();
    }
}