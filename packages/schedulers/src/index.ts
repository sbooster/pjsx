type Task = () => void
export declare type Scheduler = {
    schedule: (task: Task) => void;
}

export default {
    delay(ms: number): Scheduler {
        return {
            schedule: runnable => setTimeout(runnable, ms)
        }
    },
    async(): Scheduler {
        return {
            schedule: Promise.prototype.then.bind(Promise.resolve())
        }
    },
    macro(): Scheduler {
        return this.delay(0)
    },
    immediate(): Scheduler {
        return {
            schedule: (task: Task) => task()
        }
    },
}