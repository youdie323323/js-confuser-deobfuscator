import * as parser from "@babel/parser";
import * as t from "@babel/types";
import generate from "@babel/generator";
import { transform } from "../Sources/Transforms/Transform";
import { obfuscateAST } from "js-confuser";
import type { ObfuscateOptions } from "js-confuser";
import * as fs from "fs/promises";
import * as path from "path";

async function iterateBooleanOptionsCombinations(
    keys: Array<string>,
    callback: (options: Record<string, boolean>) => Promise<void>,
) {
    const totalCombinations = Math.pow(2, keys.length);

    const indices = Array.from({ length: totalCombinations }, (_, index) => index);

    for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));

        [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    const combination: Record<string, boolean> = {};

    for (const i of indices) {
        for (let j = 0; j < keys.length; j++)
            combination[keys[j]] = Boolean((i >> j) & 1);

        await callback(combination);
    }
}

const LOG_FILE_PATH = path.join(__dirname, "failed_options.jsonl");

interface Failure {
    reason: string;

    [key: string]: any;
}

async function logFailure(failure: Failure) {
    try {
        const line = JSON.stringify(failure) + "\n";

        await fs.appendFile(LOG_FILE_PATH, line, "utf-8");
    } catch (e) {
        console.error("Failed to write to log file:", e);
    }
}

const TEST_SUPPORTED_CONFIG_KEYS: Array<keyof ObfuscateOptions> = [
    "duplicateLiteralsRemoval",
    "pack",
    "shuffle",
    "variableMasking",
    "astScrambler",
    "stringCompression",
    "stringConcealing",
    "stringSplitting",
    "calculator",
    "opaquePredicates",
    "globalConcealing",
    "deadCode",
    "flatten",
];

(async function () {
    try { // Clear old log file
        await fs.unlink(LOG_FILE_PATH);
    } catch (e) { }

    const code = `
        console.log("Hello skrr pip pop udurak huhuhuhuhuh");
    `;

    // Just check if included in code
    const expectedOutputCode = `console.log("Hello skrr pip pop udurak huhuhuhuhuh");`;

    const codeAST = parser.parse(code);

    const baseObfuscateOptions: ObfuscateOptions = {
        target: "browser",

        identifierGenerator: "hexadecimal",
    };

    await iterateBooleanOptionsCombinations(
        TEST_SUPPORTED_CONFIG_KEYS,
        async (obfuscateOptions) => {
            const mergedObfuscateOptions: ObfuscateOptions =
                Object.assign(obfuscateOptions, baseObfuscateOptions);

            try {
                const clonedCodeAST = t.cloneNode(codeAST);

                const obfuscatedCodeAST = await obfuscateAST(clonedCodeAST, mergedObfuscateOptions);

                await transform(obfuscatedCodeAST, false);

                const { code: obfuscatedCodeASTCode } = generate(obfuscatedCodeAST);

                if (obfuscatedCodeASTCode.includes(expectedOutputCode))
                    console.log("Test succeed");
                else {
                    console.log("Test failed - output mismatch");

                    logFailure({
                        reason: "mismatch",

                        options: mergedObfuscateOptions,
                    });
                }
            } catch (e) {
                console.log("Error threw:", e.toString());

                logFailure({
                    reason: "error",

                    errorMessage: e.toString(),
                    options: mergedObfuscateOptions,
                });
            }
        },
    );
})();