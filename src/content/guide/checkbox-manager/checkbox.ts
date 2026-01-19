export class FMG_Checkbox {
    public readonly input: HTMLInputElement;

    public readonly locationId: Id;
    public mapId?: Id;

    private changeCallbacks: Array<() => void> = [];

    constructor(input: HTMLInputElement) {
        this.input = this.replaceInput(input);
        this.locationId =
            input.getAttribute("data-location-id") ??
            (() => {
                throw new Error("Input does not hava data-location-id.");
            })();
    }

    /**
     * Add on change callback
     */
    public onChange(cb: () => void): void {
        this.input.addEventListener("change", cb);
        this.changeCallbacks.push(cb);
    }

    /**
     * Cleanup event listeners
     */
    public cleanup(): void {
        for (const cb of this.changeCallbacks) {
            this.input.removeEventListener("change", cb);
        }
        this.changeCallbacks = [];
    }

    /**
     * Replaces Mapgenie's checkbox with our own
     * @param input the input element to replace
     * @returns the new input element
     */
    private replaceInput(input: HTMLInputElement): HTMLInputElement {
        const clone = input.cloneNode(true) as HTMLInputElement;
        clone.classList.add("fmg-checkbox");
        input.parentElement?.appendChild(clone);
        input.style.display = "none";
        return clone;
    }

    /**
     * Visualy mark the checkbox as checked or not
     * @param marked whether the checkbox should be marked or not
     */
    public mark(marked: boolean): void {
        this.input.checked = marked;
    }

    /**
     * Check if the checkbox is marked
     */
    public get isMarked(): boolean {
        return this.input.checked;
    }
}
