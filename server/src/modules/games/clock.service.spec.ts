import { ClockService } from './clock.service';
import { GameStateService } from './game-state.service';

describe('ClockService', () => {
  let service: ClockService;

  beforeEach(() => {
    jest.useFakeTimers();
    service = new ClockService({} as GameStateService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('fires the timeout callback 500ms after the remaining time (grace period)', () => {
    const onTimeout = jest.fn();
    service.scheduleTimeout('g1', 'white', 1_000, onTimeout);

    jest.advanceTimersByTime(1_499);
    expect(onTimeout).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    expect(onTimeout).toHaveBeenCalledWith('g1', 'white');
    expect(service.hasActiveTimeout('g1')).toBe(false);
  });

  it('cancelTimeout prevents the callback from firing', () => {
    const onTimeout = jest.fn();
    service.scheduleTimeout('g1', 'black', 1_000, onTimeout);

    service.cancelTimeout('g1');
    jest.advanceTimersByTime(10_000);

    expect(onTimeout).not.toHaveBeenCalled();
    expect(service.hasActiveTimeout('g1')).toBe(false);
  });

  it('rescheduling the same game replaces the previous timeout', () => {
    const first = jest.fn();
    const second = jest.fn();
    service.scheduleTimeout('g1', 'white', 1_000, first);
    service.scheduleTimeout('g1', 'black', 5_000, second);

    jest.advanceTimersByTime(2_000);
    expect(first).not.toHaveBeenCalled();

    jest.advanceTimersByTime(3_500);
    expect(second).toHaveBeenCalledWith('g1', 'black');
  });

  it('tracks timeouts per game independently', () => {
    const onTimeout = jest.fn();
    service.scheduleTimeout('g1', 'white', 1_000, onTimeout);
    service.scheduleTimeout('g2', 'white', 1_000, onTimeout);

    service.cancelTimeout('g1');

    expect(service.hasActiveTimeout('g1')).toBe(false);
    expect(service.hasActiveTimeout('g2')).toBe(true);

    jest.advanceTimersByTime(1_500);
    expect(onTimeout).toHaveBeenCalledTimes(1);
    expect(onTimeout).toHaveBeenCalledWith('g2', 'white');
  });

  it('cancelTimeout on an unknown game is a no-op', () => {
    expect(() => service.cancelTimeout('unknown')).not.toThrow();
  });
});
