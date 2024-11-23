export enum Signal {
    DATA,
    ERROR,
    CLOSE
}

export declare type Listener<T> = (signal: Signal, data?: T | Error) => void