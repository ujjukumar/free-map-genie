import debounce from "@shared/debounce";

describe("debounce", () => {
    beforeEach(() => {
        createWindow();
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it("should delay the callback execution", () => {
        const cb = jest.fn();
        const debounced = debounce(cb, 100);

        debounced();
        expect(cb).not.toHaveBeenCalled();

        jest.advanceTimersByTime(50);
        expect(cb).not.toHaveBeenCalled();

        jest.advanceTimersByTime(50);
        expect(cb).toHaveBeenCalledTimes(1);
    });

    it("should only execute the last call if multiple calls happen within the timeout", () => {
        const cb = jest.fn();
        const debounced = debounce(cb, 100);

        debounced(1);
        debounced(2);
        debounced(3);

        jest.advanceTimersByTime(100);
        expect(cb).toHaveBeenCalledTimes(1);
        expect(cb).toHaveBeenCalledWith(3);
    });

    it("should reset the timer on each call", () => {
        const cb = jest.fn();
        const debounced = debounce(cb, 100);

        debounced();
        jest.advanceTimersByTime(50);
        debounced();
        jest.advanceTimersByTime(50);
        expect(cb).not.toHaveBeenCalled();

        jest.advanceTimersByTime(50);
        expect(cb).toHaveBeenCalledTimes(1);
    });
});
