import fs from "fs/promises";
import path from "path";

interface MapSave {
    version: number;
    gameId: number;
    mapId: number;
    userId: number;
    data: {
        locationIds: number[];
    };
}

async function mergeSaves(file1: string, file2: string) {
    try {
        console.log(`Reading file 1: ${file1}`);
        const content1 = await fs.readFile(file1, "utf-8");

        console.log(`Reading file 2: ${file2}`);
        const content2 = await fs.readFile(file2, "utf-8");

        const save1 = JSON.parse(content1) as MapSave;
        const save2 = JSON.parse(content2) as MapSave;

        if (save1.gameId !== save2.gameId || save1.mapId !== save2.mapId) {
            console.warn("Warning: Game ID or Map ID do not match!");
            console.warn(`File 1: Game ${save1.gameId}, Map ${save1.mapId}`);
            console.warn(`File 2: Game ${save2.gameId}, Map ${save2.mapId}`);
        }

        const initialCount = save1.data.locationIds.length;
        const newIds = save2.data.locationIds;

        // Merge and deduplicate
        const mergedSet = new Set([...save1.data.locationIds, ...newIds]);
        save1.data.locationIds = Array.from(mergedSet).sort((a, b) => a - b);

        const finalCount = save1.data.locationIds.length;
        const addedCount = finalCount - initialCount;

        // Write back to file 1
        await fs.writeFile(file1, JSON.stringify(save1, null, 2));

        console.log(`Successfully merged '${file2}' into '${file1}'.`);
        console.log(`Initial locations: ${initialCount}`);
        console.log(`Merged locations: ${finalCount}`);
        console.log(`Added: ${addedCount}`);
    } catch (error) {
        console.error("Error merging saves:", error);
        process.exit(1);
    }
}

const args = process.argv.slice(2);
if (args.length !== 2) {
    console.error(
        "Usage: npx ts-node --esm scripts/merge-saves.ts <file1> <file2>"
    );
    process.exit(1);
}

const [file1, file2] = args;
mergeSaves(file1, file2);
