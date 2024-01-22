import { RuntimeStore, SimpleDirection, SimplePlayback } from 'ontime-types';

import { useRuntimeStore } from '../stores/runtime';
import { socketSendJson } from '../utils/socket';

export const useRundownEditor = () => {
  const featureSelector = (state: RuntimeStore) => ({
    playback: state.playback,
    selectedEventId: state.loaded.selectedEventId,
    nextEventId: state.loaded.nextEventId,
  });

  return useRuntimeStore(featureSelector);
};

export const useOperator = () => {
  const featureSelector = (state: RuntimeStore) => ({
    playback: state.playback,
    selectedEventId: state.loaded.selectedEventId,
  });

  return useRuntimeStore(featureSelector);
};

export const useMessageControl = () => {
  const featureSelector = (state: RuntimeStore) => ({
    timerMessage: state.timerMessage,
    publicMessage: state.publicMessage,
    lowerMessage: state.lowerMessage,
    externalMessage: state.externalMessage,
    onAir: state.onAir,
  });

  return useRuntimeStore(featureSelector);
};

export const setMessage = {
  presenterText: (payload: string) => socketSendJson('set-timer-message-text', payload),
  presenterVisible: (payload: boolean) => socketSendJson('set-timer-message-visible', payload),
  publicText: (payload: string) => socketSendJson('set-public-message-text', payload),
  publicVisible: (payload: boolean) => socketSendJson('set-public-message-visible', payload),
  lowerText: (payload: string) => socketSendJson('set-lower-message-text', payload),
  lowerVisible: (payload: boolean) => socketSendJson('set-lower-message-visible', payload),
  externalText: (payload: string) => socketSendJson('set-external-message-text', payload),
  externalVisible: (payload: boolean) => socketSendJson('set-external-message-visible', payload),
  onAir: (payload: boolean) => socketSendJson('set-onAir', payload),
  timerBlink: (payload: boolean) => socketSendJson('set-timer-blink', payload),
  timerBlackout: (payload: boolean) => socketSendJson('set-timer-blackout', payload),
};

export const usePlaybackControl = () => {
  const featureSelector = (state: RuntimeStore) => ({
    playback: state.playback,
    selectedEventIndex: state.loaded.selectedEventIndex,
    numEvents: state.loaded.numEvents,
  });

  return useRuntimeStore(featureSelector);
};

export const setPlayback = {
  start: () => socketSendJson('start'),
  pause: () => socketSendJson('pause'),
  roll: () => socketSendJson('roll'),
  startNext: () => socketSendJson('start-next'),
  previous: () => {
    socketSendJson('previous');
  },
  next: () => {
    socketSendJson('next');
  },
  stop: () => {
    socketSendJson('stop');
  },
  reload: () => {
    socketSendJson('reload');
  },
  addTime: (amount: number) => {
    socketSendJson('addtime', amount);
  },
};

export const useExtraTimerTime = () => {
  const featureSelector = (state: RuntimeStore) => state.timer1.current;

  return useRuntimeStore(featureSelector);
};

export const useExtraTimer = () => {
  const featureSelector = (state: RuntimeStore) => state.timer1;

  return useRuntimeStore(featureSelector);
};

export const setExtraTimer = {
  start: () => socketSendJson('extratimer', SimplePlayback.Start),
  pause: () => socketSendJson('extratimer', SimplePlayback.Pause),
  stop: () => socketSendJson('extratimer', SimplePlayback.Stop),
  setDirection: (direction: SimpleDirection) => socketSendJson('extratimer', { direction }),
  setTime: (time: number) => socketSendJson('extratimer', { settime: time }),
};

export const useCuesheet = () => {
  const featureSelector = (state: RuntimeStore) => ({
    playback: state.playback,
    selectedEventId: state.loaded.selectedEventId,
    selectedEventIndex: state.loaded.selectedEventIndex,
    numEvents: state.loaded.numEvents,
    titleNow: state.eventNow?.title || '',
  });

  return useRuntimeStore(featureSelector);
};

export const setEventPlayback = {
  loadEvent: (eventId: string) => socketSendJson('loadid', eventId),
  startEvent: (eventId: string) => socketSendJson('startid', eventId),
  start: () => socketSendJson('start'),
  pause: () => socketSendJson('pause'),
};

export const useTimer = () => {
  const featureSelector = (state: RuntimeStore) => ({
    ...state.timer,
  });

  return useRuntimeStore(featureSelector);
};

export const setClientName = (newName: string) => socketSendJson('set-client-name', newName);

export const useRuntimeOverview = () => {
  const featureSelector = (state: RuntimeStore) => ({
    playback: state.playback,
    clock: state.timer.clock,
    numEvents: state.loaded.numEvents,
    selectedEventIndex: state.loaded.selectedEventIndex,
  });

  return useRuntimeStore(featureSelector);
};
