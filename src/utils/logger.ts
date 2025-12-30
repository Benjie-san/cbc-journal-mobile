export function logDebug(...args: unknown[]) {
  if (__DEV__) {
    console.log(...args);
  }
}

export function logWarn(...args: unknown[]) {
  console.warn(...args);
}

export function logError(...args: unknown[]) {
  console.error(...args);
}
