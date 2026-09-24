/** Fija solo el reloj (Date) para que las pruebas no dependan del día real. */
const FIXED_NOW = new Date('2026-09-24T12:00:00Z');

const useFixedClock = (now = FIXED_NOW) => {
  jest.useFakeTimers({
    now,
    doNotFake: ['nextTick', 'setImmediate', 'clearImmediate', 'setInterval', 'clearInterval',
      'setTimeout', 'clearTimeout', 'queueMicrotask', 'hrtime', 'performance']
  });
};

module.exports = { FIXED_NOW, useFixedClock };
