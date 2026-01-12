import channel from "@shared/channel/popup";

export default function DataPage() {
    async function importData() {
        try {
            await channel.content.importData();
        } catch (e: any) {
            console.error(e);
            window.toastr.error("Failed to import data: " + e.message);
        }
    }

    async function exportData() {
        try {
            await channel.content.exportData();
        } catch (e: any) {
            console.error(e);
            window.toastr.error("Failed to export data: " + e.message);
        }
    }

    async function clearData() {
        if (!confirm("Are you sure you want to clear all data?")) return;

        try {
            await channel.content.clearData();
        } catch (e: any) {
            console.error(e);
            window.toastr.error("Failed to clear data: " + e.message);
        }
    }

    return (
        <div className="fmg-data-page">
            <div className="fmg-data-buttons">
                <button className="fmg-btn" onClick={importData}>
                    <i className="fmg-icon-upload" /> Import
                </button>
                <button className="fmg-btn" onClick={exportData}>
                    <i className="fmg-icon-download" /> Export
                </button>
                <button className="fmg-btn" onClick={clearData}>
                    <i className="fmg-icon-trash" /> Clear
                </button>
            </div>
            <hr />
            <button className="fmg-btn full-width">
                Import MapGenie Account
            </button>
            <style>{`
                .fmg-data-page {
                    padding: 10px;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }
                .fmg-data-buttons {
                    display: flex;
                    gap: 5px;
                }
                .fmg-btn {
                    flex: 1;
                    padding: 8px;
                    background: #222;
                    color: #fff;
                    border: 1px solid #444;
                    border-radius: 4px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 5px;
                }
                .fmg-btn:hover {
                    background: #333;
                }
                .fmg-btn.full-width {
                    width: 100%;
                }
            `}</style>
        </div>
    );
}
