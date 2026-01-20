import version from "@shared/version";

describe("version", () => {
    describe("compareVersions", () => {
        it("should return 0 if versions are equal", () => {
            expect(version.compareVersions("1.0.0", "1.0.0")).toBe(0);
            expect(version.compareVersions("2.1.3", "2.1.3")).toBe(0);
        });

        it("should return 1 if a is greater than b", () => {
            expect(version.compareVersions("1.0.1", "1.0.0")).toBe(1);
            expect(version.compareVersions("1.1.0", "1.0.9")).toBe(1);
            expect(version.compareVersions("2.0.0", "1.9.9")).toBe(1);
        });

        it("should return -1 if a is less than b", () => {
            expect(version.compareVersions("1.0.0", "1.0.1")).toBe(-1);
            expect(version.compareVersions("1.0.9", "1.1.0")).toBe(-1);
            expect(version.compareVersions("1.9.9", "2.0.0")).toBe(-1);
        });

        it("should handle versions with different number of parts", () => {
            expect(version.compareVersions("1.1", "1.1.0")).toBe(0);
            expect(version.compareVersions("1.1.1", "1.1")).toBe(1);
            expect(version.compareVersions("1.1", "1.1.1")).toBe(-1);
        });
    });

    describe("getCurrentVersionName", () => {
        it("should include -dev if __DEBUG__ is true", () => {
            // Since __DEBUG__ is true in our test environment
            expect(version.getCurrentVersionName()).toBe(__VERSION__ + "-dev");
        });
    });

    describe("needsUpdate", () => {
        it("should return true if a newer version is available", async () => {
            expect(await version.needsUpdate("4.0.0")).toBe(true);
        });

        it("should return false if current version is up to date", async () => {
            expect(await version.needsUpdate(__VERSION__)).toBe(false);
        });

        it("should call getLatestVersion if no version is provided", async () => {
            const spy = jest
                .spyOn(version, "getLatestVersion")
                .mockResolvedValue("4.0.0");
            expect(await version.needsUpdate()).toBe(true);
            expect(spy).toHaveBeenCalled();
            spy.mockRestore();
        });
    });
});
