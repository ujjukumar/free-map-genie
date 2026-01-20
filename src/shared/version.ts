async function getLatestVersion() {
    try {
        const url = new URL("https://raw.githubusercontent.com");
        url.pathname = new URL(__HOMEPAGE__).pathname + "/main/package.json";

        const res = await fetch(url.toString());

        if (!res.ok) {
            throw new Error(
                `Failed to fetch version: ${res.status} ${res.statusText}`
            );
        }

        const json = await res.json();

        logger.debug("fetch Package.json @", url.toString(), "| Data:", json);

        if (!json.version || typeof json.version !== "string") {
            throw new Error("Invalid package.json format: missing version");
        }

        return json.version as string;
    } catch (error) {
        logger.error("Failed to fetch latest version:", error);
        throw error;
    }
}

function getCurrentVersion() {
    return __VERSION__;
}

function getCurrentVersionName() {
    return __VERSION__ + (__DEBUG__ ? "-dev" : "");
}

function compareVersions(a: string, b: string): number {
    const [aParts, bParts] = [a, b].map((v) =>
        v.split(".").map((p) => parseInt(p.match(/\d+/)?.[0] || "0"))
    );
    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
        const aPart = aParts[i] || 0;
        const bPart = bParts[i] || 0;
        if (aPart > bPart) return 1;
        if (aPart < bPart) return -1;
    }
    return 0;
}

async function needsUpdate(latest?: string) {
    latest ??= await FMG_Version.getLatestVersion();
    const current = FMG_Version.getCurrentVersion();

    logger.debug("Current version:", current);
    logger.debug("Latest version:", latest);

    return FMG_Version.compareVersions(latest, current) > 0;
}

const FMG_Version = {
    getLatestVersion,
    getCurrentVersion,
    getCurrentVersionName,
    compareVersions,
    needsUpdate
};

export default FMG_Version;
