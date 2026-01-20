export interface Callback<T, Args extends any[]> {
    (...args: Args): T;
}

export default function debounce<T, Args extends any[]>(
    cb: Callback<T, Args>,
    ms: number
): Callback<void, Args> {
    let handle: any;
    return function (...args: Args) {
        if (handle) clearTimeout(handle);
        handle = setTimeout(cb, ms, ...args);
    };
}
