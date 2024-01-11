import { SimpleTimer, SimpleTimerState } from "../../classes/simple-timer/SimpleTimer.js";
import { eventStore } from "../../stores/EventStore.js";

export type EmitFn = (state: SimpleTimerState) => void;
export type GetTimeFn = () => number;

export class ExtraTimerService {
    private timer: SimpleTimer;
    private interval: NodeJS.Timer
    private emit: EmitFn;
    private getTime: GetTimeFn;

    constructor(emit: EmitFn, getTime: GetTimeFn) {
        this.timer = new SimpleTimer();
        this.emit = emit;
        this.getTime = getTime;
        console.log('constructor', this.timer)
    }

    private startInterval() {
        this.interval = setInterval(this.update.bind(this), 500);
    }

    private stopInterval() {
        clearInterval(this.interval);
    }

    @broadcastReturn
    play() {
        this.startInterval();
        return this.timer.play(this.getTime());
    }

    @broadcastReturn
    pause() {
        return this.timer.pause(this.getTime());
    }

    @broadcastReturn
    stop() {
        this.stopInterval();
        return this.timer.stop();
    }

    @broadcastReturn
    setTime(duration: number) {
        return this.timer.setTime(duration);
    }

    @broadcastReturn
    private update() {
        return this.timer.update(this.getTime())
    }
}

function broadcastReturn(_target: any, _propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
        const result = originalMethod.apply(this, args);
        this.emit(result);
        return result;
    };

    return descriptor;
}

const emit = (state) => {
    console.log('emit clock state', state)
    eventStore.set('timer1', state)
}

const timeNow = () => Date.now()
export const extraTimerService = new ExtraTimerService(emit, timeNow)