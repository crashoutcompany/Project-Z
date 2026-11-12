import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines and merges class names using `clsx` and Tailwind's `twMerge`.
 *
 * Accepts any number of class values, filters and joins them with `clsx`, then merges Tailwind CSS classes to resolve conflicts.
 *
 * @param inputs - Class values to be combined and merged.
 * @returns A single merged class name string.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Creates a debounced version of a function that delays its execution until after a specified time has elapsed
 * since the last time it was called.
 *
 * @param fn - The function to debounce
 * @param delay - The number of milliseconds to delay execution
 * @returns A debounced version of the input function
 *
 * @example
 * ```typescript
 * const debouncedSearch = debounce((query) => {
 *   // perform search
 * }, 300);
 * ```
 */
export const debounce = <Args extends unknown[]>(
  fn: (...args: Args) => unknown,
  delay: number,
): ((...args: Args) => void) => {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      fn(...args);
    }, delay);
  };
};
