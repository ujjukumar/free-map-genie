export interface GistFile {
    filename: string;
    type: string;
    language: string;
    raw_url: string;
    size: number;
    truncated: boolean;
    content: string;
}

export interface Gist {
    url: string;
    forks_url: string;
    commits_url: string;
    id: string;
    node_id: string;
    git_pull_url: string;
    git_push_url: string;
    html_url: string;
    files: Record<string, GistFile>;
    public: boolean;
    created_at: string;
    updated_at: string;
    description: string;
    comments: number;
    user: any;
    comments_url: string;
    owner: any;
    truncated: boolean;
}

export interface SyncResult {
    success: boolean;
    gistId?: string;
    gistUrl?: string;
    error?: string;
    rateLimit?: RateLimitInfo;
}

export interface RateLimitInfo {
    limit: number;
    remaining: number;
    resetTimestamp: number;
}

export interface TokenValidationResult {
    valid: boolean;
    hasGistScope: boolean;
    error?: string;
    rateLimit?: RateLimitInfo;
}

/**
 * Parses rate limit headers from GitHub API response
 */
function parseRateLimitHeaders(response: Response): RateLimitInfo | undefined {
    const limit = response.headers.get("X-RateLimit-Limit");
    const remaining = response.headers.get("X-RateLimit-Remaining");
    const reset = response.headers.get("X-RateLimit-Reset");

    if (limit && remaining && reset) {
        return {
            limit: parseInt(limit),
            remaining: parseInt(remaining),
            resetTimestamp: parseInt(reset) * 1000
        };
    }
    return undefined;
}

export class FMG_GitHubSync {
    private static readonly GIST_DESCRIPTION = "Free Map Genie Sync Data";
    private static readonly SYNC_FILENAME = "fmg_sync_data.json";
    private static readonly README_FILENAME = "README.md";

    /**
     * Generates a beautiful README with detailed statistics
     */
    private static generateReadme(
        data: FMG.Storage.V2.ExportAllJson,
        gistId?: string
    ): string {
        const totalMaps = data.maps.length;
        const totalLocations = data.maps.reduce(
            (sum, m) => sum + (m.data.locationIds?.length ?? 0),
            0
        );
        const totalNotes = data.maps.reduce(
            (sum, m) => sum + (m.data.notes?.length ?? 0),
            0
        );
        const totalPresets = data.maps.reduce(
            (sum, m) => sum + (m.data.presets?.length ?? 0),
            0
        );
        const totalCategories = data.maps.reduce(
            (sum, m) => sum + (m.data.categoryIds?.length ?? 0),
            0
        );

        const date = new Date(data.exportDate);
        const formattedDate = date.toLocaleString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            timeZoneName: "short"
        });

        let tableRows = data.maps
            .map((map) => {
                const locs = map.data.locationIds?.length ?? 0;
                const notes = map.data.notes?.length ?? 0;
                const presets = map.data.presets?.length ?? 0;
                const cats = map.data.categoryIds?.length ?? 0;
                const lastMod = map.data.lastModified
                    ? new Date(map.data.lastModified).toLocaleDateString()
                    : "N/A";

                return `| ${map.gameId} | ${map.mapId} | ${locs} | ${notes} | ${presets} | ${cats} | ${lastMod} |`;
            })
            .join("\n");

        const historySection = gistId
            ? `
## History & Revisions

GitHub automatically tracks every change to this Gist. To view the complete history:

1. Visit: https://gist.github.com/${gistId}/revisions
2. Click on any revision to see the data at that point in time
3. Download previous versions if needed

You can also view all revisions by clicking the **Revisions** tab on this Gist page.
`
            : `
## History & Revisions

GitHub automatically tracks every change to this Gist. To view the complete history:

1. Click the **Revisions** tab on this Gist page
2. See all past versions with timestamps
3. Download or restore previous versions if needed
`;

        return `# Free Map Genie Sync Data

This Gist contains your synchronized game map progress data from [Free Map Genie](https://github.com/V1P3R-FMG/free-map-genie) browser extension.

## Sync Summary

| Metric | Value |
|--------|-------|
| **Last Synced** | ${formattedDate} |
| **Total Maps** | ${totalMaps} |
| **Total Locations Found** | ${totalLocations} |
| **Total Notes** | ${totalNotes} |
| **Total Presets** | ${totalPresets} |
| **Total Categories** | ${totalCategories} |

## Maps Breakdown

| Game ID | Map ID | Locations | Notes | Presets | Categories | Last Modified |
|---------|--------|-----------|-------|---------|------------|---------------|
${tableRows}

${historySection}

## Data Format

The actual sync data is stored in \`${this.SYNC_FILENAME}\` in JSON format. This file contains:

- **Version**: 3 (multi-map format)
- **Export Date**: ISO 8601 timestamp
- **Maps Array**: Each map entry includes:
  - Game ID and Map ID
  - Found locations
  - Custom notes
  - Presets and categories
  - Last modified timestamp

## Privacy

This Gist is **private** - only you can see it. The data is synced from the Free Map Genie browser extension using your GitHub Personal Access Token with Gist scope.

## How to Restore

1. Open the Free Map Genie extension
2. Go to Data → GitHub Sync
3. Enter your GitHub token
4. Click "Download from GitHub" to restore this data

---

*This file is auto-generated by Free Map Genie. Do not edit manually - changes will be overwritten on next sync.*
`;
    }

    /**
     * Validates if a GitHub token has gist permissions
     * @param token The GitHub Personal Access Token to validate
     * @returns Validation result with scope information
     */
    public static async validateToken(
        token: string
    ): Promise<TokenValidationResult> {
        try {
            const response = await fetch("https://api.github.com/user", {
                headers: {
                    Authorization: `token ${token}`,
                    Accept: "application/vnd.github.v3+json"
                }
            });

            const rateLimit = parseRateLimitHeaders(response);

            if (!response.ok) {
                if (response.status === 401) {
                    return {
                        valid: false,
                        hasGistScope: false,
                        error: "Invalid token or token has expired",
                        rateLimit
                    };
                }
                if (response.status === 403) {
                    return {
                        valid: false,
                        hasGistScope: false,
                        error: "Rate limit exceeded or insufficient permissions",
                        rateLimit
                    };
                }
                return {
                    valid: false,
                    hasGistScope: false,
                    error: `Failed to validate token: ${response.statusText}`,
                    rateLimit
                };
            }

            // Check X-OAuth-Scopes header for gist scope
            const scopesHeader = response.headers.get("X-OAuth-Scopes");
            const hasGistScope = scopesHeader
                ? scopesHeader.split(", ").includes("gist")
                : false;

            return {
                valid: true,
                hasGistScope,
                rateLimit
            };
        } catch (e) {
            return {
                valid: false,
                hasGistScope: false,
                error: e instanceof Error ? e.message : String(e)
            };
        }
    }

    /**
     * Uploads data to GitHub Gist
     * Creates a new gist or updates existing one with our description
     *
     * @param token GitHub Personal Access Token with gist scope
     * @param content The JSON content to upload
     * @returns The gist ID
     */
    public static async upload(
        token: string,
        content: string
    ): Promise<SyncResult> {
        try {
            // First check if we have an existing gist
            const existingGist = await this.findLatest(token);

            // Parse the data to generate README with statistics
            let readmeContent =
                "# Free Map Genie Sync Data\n\n*README generation failed - data file is still valid*";
            try {
                const data = JSON.parse(
                    content
                ) as FMG.Storage.V2.ExportAllJson;
                readmeContent = this.generateReadme(data, existingGist?.id);
            } catch {
                // If parsing fails, use default readme
            }

            const body = {
                description: this.GIST_DESCRIPTION,
                public: false,
                files: {
                    [this.SYNC_FILENAME]: {
                        content: content
                    },
                    [this.README_FILENAME]: {
                        content: readmeContent
                    }
                }
            };

            let url = "https://api.github.com/gists";
            let method = "POST";

            if (existingGist) {
                url = `https://api.github.com/gists/${existingGist.id}`;
                method = "PATCH";
            }

            const response = await fetch(url, {
                method: method,
                headers: {
                    Authorization: `token ${token}`,
                    Accept: "application/vnd.github.v3+json"
                },
                body: JSON.stringify(body)
            });

            const rateLimit = parseRateLimitHeaders(response);

            if (!response.ok) {
                const errorBody = await response.text();
                return {
                    success: false,
                    error: `Failed to upload gist: ${response.statusText} - ${errorBody}`,
                    rateLimit
                };
            }

            const gist: Gist = await response.json();
            return {
                success: true,
                gistId: gist.id,
                gistUrl: gist.html_url,
                rateLimit
            };
        } catch (e) {
            return {
                success: false,
                error: e instanceof Error ? e.message : String(e)
            };
        }
    }

    /**
     * Finds the FMG sync gist by its description
     * @param token GitHub Personal Access Token
     * @returns The gist if found, null otherwise
     */
    public static async findLatest(token: string): Promise<Gist | null> {
        const response = await fetch("https://api.github.com/gists", {
            headers: {
                Authorization: `token ${token}`,
                Accept: "application/vnd.github.v3+json"
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to list gists: ${response.statusText}`);
        }

        const gists: Gist[] = await response.json();

        // Find gist with our description
        const found = gists.find(
            (g) => g.description === this.GIST_DESCRIPTION
        );

        return found || null;
    }

    /**
     * Downloads sync data from GitHub Gist
     * @param token GitHub Personal Access Token
     * @param gistId The gist ID to download from
     * @returns The JSON content as a string
     */
    public static async download(
        token: string,
        gistId: string
    ): Promise<string> {
        const response = await fetch(`https://api.github.com/gists/${gistId}`, {
            headers: {
                Authorization: `token ${token}`,
                Accept: "application/vnd.github.v3+json"
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to get gist: ${response.statusText}`);
        }

        const gist: Gist = await response.json();

        // Look for our sync file, fall back to first file
        const syncFile = gist.files[this.SYNC_FILENAME];
        const file = syncFile ?? Object.values(gist.files)[0];

        if (!file) {
            throw new Error("Gist is empty");
        }

        // If the file is truncated, we need to fetch the raw content
        if (file.truncated) {
            const rawResponse = await fetch(file.raw_url, {
                headers: {
                    Authorization: `token ${token}`
                }
            });

            if (!rawResponse.ok) {
                throw new Error(
                    `Failed to fetch raw gist content: ${rawResponse.statusText}`
                );
            }

            return await rawResponse.text();
        }

        return file.content;
    }

    /**
     * Gets the last updated timestamp of the sync gist
     * @param token GitHub Personal Access Token
     * @returns ISO date string or null if no gist found
     */
    public static async getLastUpdated(token: string): Promise<string | null> {
        const gist = await this.findLatest(token);
        return gist?.updated_at ?? null;
    }
}
