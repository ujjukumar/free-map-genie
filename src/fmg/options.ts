import Options from "@/options.json";

export { default as Options } from "@/options.json";

const defaultSettings = Object.fromEntries(
    Options.map(({ name, value }) => [name, value])
);

export function getDefaultSettings(): FMG.Extension.Settings {
    return { ...defaultSettings } as unknown as FMG.Extension.Settings;
}
