/**
 * Returns a debounced version of the provided function.
 * The debounced function delays invoking `fn` until after `time` milliseconds have elapsed
 * since the last time the debounced function was called.
 *
 * @template {...any} TArgs
 * @param {(…args: TArgs) => void} fn - The function to debounce.
 * @param {number} time - The debounce delay in milliseconds.
 * @returns {(...args: TArgs) => void} A debounced version of `fn`.
 */
export const debounced = (fn, time) => {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), time);
    };
};
