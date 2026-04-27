import type { FMG_MapManager } from "@fmg/map-manager";

import Panel from "../Panel";
import Button from "../Button";
import Slots from "./Slots";

import "./data-panel.scss";
import Icon from "@components/Icon";

interface DataPanelProps {
    value: string;
    syncLoading: boolean;
}

export default class DataPanel extends Panel<DataPanelProps> {
    private readonly mapManager: FMG_MapManager;

    public constructor(mapManager: FMG_MapManager) {
        super("data", { value: "Hello World", syncLoading: false });
        this.mapManager = mapManager;
    }

    public override render() {
        const { mapManager } = this;

        const importData = async () => {
            await mapManager.import();
        };

        const exportData = async () => {
            await mapManager.export();
        };

        const clearData = async () => {
            await mapManager.clear();
        };

        const importMapgenieAccount = async () => {
            await mapManager.importMapgenieAccount();
        };

        const syncUpload = async () => {
            this.updateProps({ syncLoading: true });
            try {
                await mapManager.syncUpload();
            } finally {
                this.updateProps({ syncLoading: false });
            }
        };

        const syncDownload = async () => {
            this.updateProps({ syncLoading: true });
            try {
                await mapManager.syncDownload();
            } finally {
                this.updateProps({ syncLoading: false });
            }
        };

        const syncMerge = async () => {
            this.updateProps({ syncLoading: true });
            try {
                await mapManager.syncMerge();
            } finally {
                this.updateProps({ syncLoading: false });
            }
        };

        const { syncLoading } = this.props;

        return (
            <>
                <div className="section-label">File Import/Export</div>
                <div className="btn-group">
                    <Button onClick={importData}>
                        <Icon icon="upload" />
                        Import
                    </Button>
                    <Button onClick={exportData}>
                        <Icon icon="download" />
                        Export
                    </Button>
                    <Button onClick={clearData}>
                        <Icon icon="trash" />
                        Clear
                    </Button>
                </div>
                <div className="section-label">GitHub Sync (All Maps)</div>
                <div className="btn-group">
                    <Button onClick={syncUpload} disabled={syncLoading}>
                        <Icon icon="cloud-upload" />
                        {syncLoading ? "..." : "Upload"}
                    </Button>
                    <Button onClick={syncDownload} disabled={syncLoading}>
                        <Icon icon="cloud-download" />
                        {syncLoading ? "..." : "Download"}
                    </Button>
                    <Button onClick={syncMerge} disabled={syncLoading}>
                        <Icon icon="cloud-download" />
                        {syncLoading ? "..." : "Merge"}
                    </Button>
                </div>
                <div className="sync-hint">
                    Set your GitHub token in the extension popup
                </div>
                {mapManager.slots && (
                    <>
                        <div className="section-label">Save Slots</div>
                        <Slots
                            slotManager={mapManager.slots}
                            mapManager={mapManager}
                            loading={syncLoading}
                            setLoading={(loading) =>
                                this.updateProps({ syncLoading: loading })
                            }
                            userId={mapManager.storage.keyData.userId}
                        />
                    </>
                )}
                <div className="section-label">MapGenie Account</div>
                <div className="btn-group">
                    <Button onClick={importMapgenieAccount}>
                        <Icon icon="cloud" />
                        Import From Mapgenie Account
                    </Button>
                </div>
            </>
        );
    }
}
