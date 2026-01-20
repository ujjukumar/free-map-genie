import {
    isEmpty,
    isDefined,
    checkDefined,
    isNotEmpty,
    hasKeys,
    getDiffForDicyById,
    UndefinedError
} from "@shared/utils";

describe("utils", () => {
    describe("isEmpty", () => {
        it("should return true when value is empty or nullable, and false otherwise", () => {
            expect(isEmpty({})).toBe(true);
            expect(isEmpty({ a: 1 })).toBe(false);
            expect(isEmpty([])).toBe(true);
            expect(isEmpty([1])).toBe(false);
            expect(isEmpty("")).toBe(true);
            expect(isEmpty("Hello World")).toBe(false);
            expect(isEmpty(null)).toBe(true);
            expect(isEmpty(undefined)).toBe(true);
            expect(isEmpty(0)).toBe(true);
            expect(isEmpty(1)).toBe(false);
            expect(isEmpty(-1)).toBe(false);
            expect(isEmpty(false)).toBe(true);
            expect(isEmpty(true)).toBe(false);
        });
    });

    describe("isDefined", () => {
        it("should return true if value is defined, and false otherwise", () => {
            expect(isDefined(0)).toBe(true);
            expect(isDefined("")).toBe(true);
            expect(isDefined(false)).toBe(true);
            expect(isDefined(null)).toBe(false);
            expect(isDefined(undefined)).toBe(false);
        });

        it("should throw UndefinedError if name is provided and value is undefined", () => {
            expect(() => isDefined(undefined, "test")).toThrow(UndefinedError);
            expect(() => isDefined(undefined, "test")).toThrow(
                "test is not defined!"
            );
        });
    });

    describe("checkDefined", () => {
        it("should return the value if defined", () => {
            expect(checkDefined(1, "test")).toBe(1);
        });

        it("should throw if undefined", () => {
            expect(() => checkDefined(undefined, "test")).toThrow(
                UndefinedError
            );
        });
    });

    describe("isNotEmpty", () => {
        it("should return true if value is not empty", () => {
            expect(isNotEmpty({ a: 1 })).toBe(true);
            expect(isNotEmpty({})).toBe(false);
        });
    });

    describe("hasKeys", () => {
        it("should return true if object has all keys", () => {
            expect(hasKeys({ a: 1, b: 2 }, ["a", "b"])).toBe(true);
            expect(hasKeys({ a: 1 }, ["a", "b"])).toBe(false);
        });
    });

    describe("getDiffForDicyById", () => {
        it("should return added and removed keys", () => {
            const prev = { "1": "a", "2": "b" };
            const curr = { "2": "b", "3": "c" };
            const diff = getDiffForDicyById(prev, curr);
            expect(diff.added).toEqual(["3"]);
            expect(diff.removed).toEqual(["1"]);
        });
    });
});
