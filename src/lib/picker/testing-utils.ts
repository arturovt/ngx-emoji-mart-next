/** Waits for the timers that are already scheduled with `setTimeout`. */
export const timeout = () => new Promise<void>(resolve => setTimeout(resolve));

/** Waits for the next animation frame. Callbacks that were requested earlier run first. */
export const frame = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
