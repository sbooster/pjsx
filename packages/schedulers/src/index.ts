type Task = () => void
export declare type Scheduler = {
    schedule: (task: Task) => void;
}
export declare type CancellableScheduler = {
    schedule: (task: Task) => { cancel: () => void };
} & Scheduler

export default {
    delay(ms: number): CancellableScheduler {
        return {
            schedule: runnable => {
                let id = setTimeout(runnable, ms)
                return {
                    cancel: () => {
                        if (id != null) {
                            clearTimeout(id)
                        }
                    }
                }
            }
        }
    },
    macro(): CancellableScheduler {
        return this.delay(0)
    },
    async(): Scheduler {
        return {
            schedule: Promise.prototype.then.bind(Promise.resolve())
        }
    },
    immediate(): Scheduler {
        return {
            schedule: (task: Task) => task()
        }
    },
}