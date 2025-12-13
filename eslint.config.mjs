import globals from "globals";
import tsdoc from "eslint-plugin-tsdoc";
import tseslint from "typescript-eslint";
import stylistic from "@stylistic/eslint-plugin";
import importPlugin from "eslint-plugin-import";

const ALERT_STYLE = "warn";

export default tseslint.config(
    { files: ["**/*.{ts,tsx}"] },
    importPlugin.flatConfigs.recommended,
    {
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",

            globals: {
                ...globals.browser,
                ...globals.node,
            },
            parser: tseslint.parser,
            parserOptions: {
                project: true,
            },
        },
        plugins: {
            // Lints
            tsdoc,
            "@typescript-eslint": tseslint.plugin,

            // Formats
            "@stylistic": stylistic,
        },
        rules: {
            // Lints
            "no-unused-vars": "off",
            "no-self-assign": "error",

            "tsdoc/syntax": ALERT_STYLE,

            "@typescript-eslint/consistent-type-exports": "error",
            "@typescript-eslint/consistent-type-imports": "error",

            // Formats
            "@stylistic/indent": [ALERT_STYLE, 4],
            "@stylistic/block-spacing": ALERT_STYLE,
            "@stylistic/brace-style": [ALERT_STYLE, "1tbs", { allowSingleLine: true }],
            "@stylistic/function-call-spacing": [ALERT_STYLE, "never"],
            "@stylistic/comma-dangle": [ALERT_STYLE, "always-multiline"],
            "@stylistic/key-spacing": [ALERT_STYLE, { beforeColon: false }],
            "@stylistic/keyword-spacing": [ALERT_STYLE, {
                before: true,
                after: true,
            }],
            /*
            "@stylistic/lines-around-comment": [alertStyle, {
                beforeLineComment: true,

                // JS
                allowBlockStart: true,
                allowBlockEnd: false,
                allowObjectStart: true,
                allowObjectEnd: false,

                // TS
                allowEnumStart: true,
                allowInterfaceStart: true,
                allowTypeStart: true,
            }],
            */
            "@stylistic/lines-between-class-members": [ALERT_STYLE, {
                enforce: [
                    // I love the blank line for each category fields
                    /*
                    {
                        blankLine: "never",
                        prev: "field",
                        next: "field",
                    },
                    */
                    {
                        blankLine: "always",
                        prev: "method",
                        next: "method",
                    },
                ],
            }],
            "@stylistic/member-delimiter-style": [ALERT_STYLE, {
                multiline: {
                    delimiter: "semi",
                    requireLast: true,
                },
                singleline: {
                    delimiter: "semi",
                    requireLast: false,
                },
                multilineDetection: "brackets",
            }],
            "@stylistic/no-extra-semi": ALERT_STYLE,
            "@stylistic/object-property-newline": [ALERT_STYLE, { allowAllPropertiesOnSameLine: true }],
            "@stylistic/padding-line-between-statements": [
                ALERT_STYLE,

                // TODO: add style for TS blocks
                {
                    blankLine: "always",
                    prev: "*",
                    next: "return",
                },
                {
                    blankLine: "always",
                    prev: "*",
                    next: "function",
                },
                // Gonna disable this for post-process IFs
                /*
                {
                    blankLine: "always",
                    prev: "*",
                    next: "if",
                },
                */
                {
                    blankLine: "always",
                    prev: "*",
                    next: "block",
                },
            ],
            // "@stylistic/quote-props": [alertStyle, "as-needed"],
            "@stylistic/quotes": "off",
            "@stylistic/semi": ALERT_STYLE,
            "@stylistic/space-before-blocks": ALERT_STYLE,
            "@stylistic/space-before-function-paren": [ALERT_STYLE, {
                named: "never",
                anonymous: "always",
                asyncArrow: "always",
            }],
            "@stylistic/space-infix-ops": ALERT_STYLE,
            "@stylistic/type-annotation-spacing": ALERT_STYLE,
        },
        settings: {
            "import/resolver": {
                typescript: true,
                node: true,
            },
        },
    },
);