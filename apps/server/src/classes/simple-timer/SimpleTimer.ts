import { SimpleDirection, SimplePlayback, SimpleTimerState } from 'ontime-types';

export class SimpleTimer {
  state: SimpleTimerState = {
    duration: 0,
    current: 0,
    playback: SimplePlayback.Stop,
    direction: SimpleDirection.CountDown,
  };
  private startedAt: number | null = null;
  private pausedAt: number | null = null;

  constructor() {}

  public reset() {
    this.state = {
      duration: 0,
      current: 0,
      playback: SimplePlayback.Stop,
      direction: SimpleDirection.CountDown,
    };
  }

  /**
   * Sets the duration of the timer
   * @param time - time in milliseconds
   */
  public setTime(time: number): SimpleTimerState {
    this.state.duration = time;
    this.state.current = time;
    return this.state;
  }

  public setDirection(direction: SimpleDirection): SimpleTimerState {
    this.state.direction = direction;
    return this.state;
  }

  public start(timeNow: number): SimpleTimerState {
    if (this.state.playback === SimplePlayback.Pause) {
      const elapsedSincePause = this.pausedAt - this.startedAt;
      this.startedAt = timeNow - elapsedSincePause;
    } else if (this.state.playback === SimplePlayback.Stop) {
      this.startedAt = timeNow;
    }
    this.state.playback = SimplePlayback.Start;
    return this.update(timeNow);
  }

  public pause(timeNow: number): SimpleTimerState {
    this.state.playback = SimplePlayback.Pause;
    this.pausedAt = timeNow;
    return this.state;
  }

  public stop(): SimpleTimerState {
    this.state.playback = SimplePlayback.Stop;
    this.state.current = this.state.duration;
    this.startedAt = null;
    return this.state;
  }

  public update(timeNow: number): SimpleTimerState {
    if (this.state.playback === SimplePlayback.Start) {
      const elapsed = timeNow - this.startedAt;
      if (this.state.direction === SimpleDirection.CountDown) {
        this.state.current = this.state.duration - elapsed;
      } else if (this.state.direction === SimpleDirection.CountUp) {
        this.state.current = this.state.duration + elapsed;
      }
    }

    return this.state;
  }
}
