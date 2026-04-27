import { InjectedComponent } from "@shared/react";
import type { FMG_MapManager } from "@fmg/map-manager";

export interface ProgressProps {
    total: number;
    value: number;
    hr?: boolean;
}

class Progress extends InjectedComponent<ProgressProps> {
    public constructor(hr?: boolean) {
        super(
            {
                element: ".category-progress",
                place: "before"
            },
            {
                total: 0,
                value: 0,
                hr
            }
        );
    }

    public setProgress(value: number, total: number) {
        super.updateProps({ value, total });
    }

    public setTotal(total: number) {
        super.updateProps({ total });
    }

    public reset() {
        super.updateProps({ value: 0 });
    }

    public increment(amount = 1) {
        this.updateProps({
            value: this.props.value + amount
        });
    }

    protected override render() {
        const { total, value, hr } = this.props;

        const percent =
            total === 0 && value === 0 ? 100 : (value / total) * 100;

        return (
            <>
                <div
                    className="progress-item-wrapper"
                    style={{ marginRight: "10px" }}
                >
                    <div className="progress-item">
                        <span className="title">
                            {percent.toFixed(2) + "%"}
                        </span>
                        <span className="counter">
                            {value} / {total}
                        </span>
                        <div className="progress-bar-container">
                            <div
                                className="progress-bar"
                                role="progressbar"
                                style={{ width: percent + "%" }}
                            ></div>
                        </div>
                    </div>
                </div>
                {hr ? <hr /> : undefined}
            </>
        );
    }
}

export class TotalProgress extends Progress {
    private mapManager: FMG_MapManager;

    public constructor(mapManager: FMG_MapManager) {
        super(true);

        this.mapManager = mapManager;
    }

    public update() {
        const { map } = this.mapManager.store.getState();
        const { locationIds } = this.mapManager.storage.data;

        const total = map.locations.length;
        const value = locationIds.length;

        this.updateProps({ total, value });
    }
}

export class CategoryProgress extends Progress {
    private mapManager: FMG_MapManager;

    public constructor(mapManager: FMG_MapManager) {
        super();

        this.mapManager = mapManager;
    }

    public update() {
        const locByCat =
            this.mapManager.store.getState().map.locationsByCategory;
        const { categoryIds, locations } = this.mapManager.storage.data;

        // Pre-compute all category locations in a single pass
        let total = 0;
        const categoryLocations: number[] = [];
        for (const catId of categoryIds) {
            const catLocs = locByCat[catId];
            if (catLocs) {
                total += catLocs.length;
                for (const loc of catLocs) {
                    categoryLocations.push(loc.id);
                }
            }
        }

        // Count found locations using the Set for O(1) lookups
        const locationIds = new Set(this.mapManager.storage.data.locationIds);
        let value = 0;
        for (const locId of categoryLocations) {
            if (locationIds.has(locId)) {
                value++;
            }
        }

        this.updateProps({ total, value });
    }
}
