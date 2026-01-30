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

            const body = {
                description: this.GIST_DESCRIPTION,
                public: false,
                files: {
                    [this.SYNC_FILENAME]: {
                        content: content
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
