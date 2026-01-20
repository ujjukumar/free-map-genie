import { Logger, ConsoleLogTemplate } from "@fmg/logger";

describe("ConsoleLogTemplate", () => {
    it("should compile CSS correctly", () => {
        const template = new ConsoleLogTemplate({ color: "red" });
        const css = (template as any).compileCss({ fontWeight: "bold" });
        expect(css).toBe("color:red;font-weight:bold;");
    });

    it("should transform kebab case correctly", () => {
        const template = new ConsoleLogTemplate();
        expect((template as any).transformKebabCase("fontWeight")).toBe(
            "font-weight"
        );
        expect((template as any).transformKebabCase("borderRadius")).toBe(
            "border-radius"
        );
    });

    it("should add tags and compile correctly", () => {
        const template = new ConsoleLogTemplate({ color: "white" });
        template.addTag("TAG1", { background: "black" });
        template.addTag(() => "TAG2", { background: "blue" });

        const compiled = template.compile();
        expect(compiled[0]).toBe("%c%s%c%s%c");
        expect(compiled[1]).toBe("color:white;background:black;");
        expect(compiled[2]).toBe("TAG1");
        expect(compiled[3]).toBe("color:white;background:blue;");
        expect(compiled[4]).toBe("TAG2");
    });
});

describe("Logger", () => {
    let logSpy: jest.SpyInstance;
    let warnSpy: jest.SpyInstance;
    let errorSpy: jest.SpyInstance;

    beforeEach(() => {
        logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
        warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
        errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
        logSpy.mockRestore();
        warnSpy.mockRestore();
        errorSpy.mockRestore();
    });

    it("should log messages with correct tags", () => {
        const logger = new Logger("TEST");
        logger.unmute();
        logger.log("Hello World");
        expect(logSpy).toHaveBeenCalled();
        const args = logSpy.mock.calls[0];
        expect(args[0]).toContain("%c%s%c%s%c");
        expect(args[args.length - 1]).toBe("Hello World");
    });

    it("should respect muted state", () => {
        const logger = new Logger("TEST");
        logger.mute();
        logger.log("Hello World");
        expect(logSpy).not.toHaveBeenCalled();

        logger.unmute();
        logger.log("Hello World");
        expect(logSpy).toHaveBeenCalled();
    });

    it("should respect __DEBUG__ for debug logs", () => {
        // Since we set __DEBUG__ to true in env/main.ts
        const logger = new Logger("TEST");
        logger.unmute();
        logger.debug("Debug Message");
        expect(logSpy).toHaveBeenCalled();

        // We can't easily change __DEBUG__ global variable here if it's constant
        // but we can test the logic by manually setting muted
    });
});
