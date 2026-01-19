/**
 * Recursively filters an object by applying a filter function to each value.
 * Returns a new object with only the values that pass the filter.
 *
 * @param object - The object to filter
 * @param filter - Function that returns true to keep the value, false to remove it
 * @returns A new filtered object
 */
function deepFilter<T extends object>(
    object: T,
    filter: (value: any, prop: string, subject: object) => boolean
): T {
    if (Array.isArray(object)) {
        const filtered = object
            .filter((value, index) => filter(value, String(index), object))
            .map((value) => {
                if (typeof value === "object" && value !== null) {
                    return deepFilter(value, filter);
                }
                return value;
            });
        return (filtered.length > 0 ? filtered : undefined) as T;
    }

    if (typeof object === "object" && object !== null) {
        const result: any = {};

        for (const [key, value] of Object.entries(object)) {
            if (filter(value, key, object)) {
                if (typeof value === "object" && value !== null) {
                    const filtered = deepFilter(value, filter);
                    // Only add if filtered result has content
                    if (
                        filtered !== undefined &&
                        (Array.isArray(filtered)
                            ? filtered.length > 0
                            : Object.keys(filtered).length > 0)
                    ) {
                        result[key] = filtered;
                    }
                } else {
                    result[key] = value;
                }
            }
        }

        return result as T;
    }

    return object;
}

export = deepFilter;
