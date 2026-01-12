/**
 * @typedef {import("webpack").LoaderContext<any>} LoaderContext
 *
 * @this {LoaderContext}
 * @param {string} source
 * @returns {string}
 */
export default function injectGlobals(source) {
    return source.replace(
        "__GLOBAL_API_SECRET__",
        JSON.stringify("Iz0b5C3fjesjMuqKzj79ATDjQrymQOT?")
    );
}
