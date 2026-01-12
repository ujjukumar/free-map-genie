import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.mjs"],
        languageOptions: {
            parserOptions: {
                ecmaVersion: "latest",
                sourceType: "module"
            },
            globals: {
                __DEBUG__: "readonly",
                __BROWSER__: "readonly",
                __MODE__: "readonly",
                __VERSION__: "readonly",
                __AUTHOR__: "readonly",
                __HOMEPAGE__: "readonly",
                __WATCH__: "readonly",
                chrome: "readonly",
                logger: "readonly",
                $: "readonly",
                jQuery: "readonly",
                React: "readonly",
                window: "readonly",
                document: "readonly",
                localStorage: "readonly",
                URL: "readonly",
                Blob: "readonly",
                HTMLScriptElement: "readonly",
                HTMLMetaElement: "readonly",
                HTMLLinkElement: "readonly",
                HTMLInputElement: "readonly",
                NodeJS: "readonly",
                global: "readonly",
                globalThis: "readonly",
                console: "readonly",
                setInterval: "readonly",
                clearInterval: "readonly",
                setTimeout: "readonly",
                clearTimeout: "readonly",
                process: "readonly",
                __dirname: "readonly",
                module: "readonly",
                require: "readonly"
            }
        },
        rules: {
            semi: ["error", "always"],
            "no-constant-condition": "off",
            "@typescript-eslint/no-unused-vars": "off",
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/explicit-function-return-type": "off",
            "@typescript-eslint/no-empty-object-type": "off",
            "no-undef": "off",
            "no-self-assign": "off",
            "no-case-declarations": "off",
            "no-var": "warn",
            "no-fallthrough": "warn",
            "prefer-spread": "warn"
        }
    },
    {
        ignores: [
            "node_modules/",
            "dist/",
            "mapgenie/",
            "webpack.config.js",
            "scripts/",
            "test_font/"
        ]
    }
);
