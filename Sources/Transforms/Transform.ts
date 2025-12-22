import type { Visitor } from "@babel/traverse";
import * as parser from "@babel/parser";
import * as t from "@babel/types";
import traverse from "@babel/traverse";
import { webcrack } from "webcrack";
import generate from "@babel/generator";
import cliProgress from "cli-progress";
import * as readline from "readline";

import transformPack from "./TransformPack";
import transformASTScrambler from "./TransformASTScrambler";
import transformMovedDeclarations from "./TransformMovedDeclarations";
import transformControlFlowFlattening from "./TransformControlFlowFlattening";
import transformShuffle from "./TransformShuffle";
import transformDuplicateLiteralsRemoval from "./TransformDuplicateLiteralsRemoval";
import transformVariableMasking from "./TransformVariableMasking";
import transformStringCompression from "./String/TransformStringCompression";
import transformStringConcealing from "./String/TransformStringConcealing";
import transformOpaquePredicates from "./TransformOpaquePredicates";
import transformGlobalConcealing from "./TransformGlobalConcealing";
import transformCalculator from "./TransformCalculator";
import transformDeadCode from "./TransformDeadCode";
import transformDispatcher from "./TransformDispatcher";
import transformFlatten from "./TransformFlatten";
import transformPreparation from "./TransformPreparation";

// TODO: movedDeclarations can be reversed by using the same method as variableMasking

/*
  Irreversible transforms:
    objectExtraction
    renameVariables
    renameLabels
*/

// This is ordered. Don't change
// https://github.com/MichaelXF/js-confuser/blob/master/src/order.ts
export const ALL_TRANSFORMS: ReadonlyArray<Transform> = [
    transformPack,
    transformASTScrambler,
    transformMovedDeclarations,
    transformControlFlowFlattening,
    transformShuffle,
    transformDuplicateLiteralsRemoval,
    transformVariableMasking,
    transformStringCompression,
    transformStringConcealing,
    transformOpaquePredicates,
    transformGlobalConcealing,
    transformCalculator,
    transformDeadCode,
    transformDispatcher,
    transformFlatten,
    transformPreparation,
];

/**
 * Removes function length setter and it references.
 */
export const transformFunctionLengthSetterRemoval: SharedEstimableVisitor = context => isEstimate => {
    const isNotEstimate = !isEstimate;

    return {
        FunctionDeclaration(path) {
            const {
                node,
                node: { params, body: { body } },
                parentPath,
            } = path;

            const { id: { name } } = node;

            if (!(
                params.length === 2 &&
                t.isIdentifier(params[0]) &&
                t.isAssignmentPattern(params[1]) &&
                t.isIdentifier(params[1].left) &&
                t.isNumericLiteral(params[1].right)
            ))
                return;

            if (!(
                body.length === 2 &&
                t.isExpressionStatement(body[0]) &&
                t.isCallExpression(body[0].expression) &&
                t.isMemberExpression(body[0].expression.callee) &&
                t.isIdentifier(body[0].expression.callee.object, { name: "Object" }) &&
                t.isIdentifier(body[0].expression.callee.property, { name: "defineProperty" }) &&
                body[0].expression.arguments.length === 3 &&
                t.isIdentifier(body[0].expression.arguments[0], { name: params[0].name }) &&
                t.isStringLiteral(body[0].expression.arguments[1], { value: "length" }) &&
                t.isObjectExpression(body[0].expression.arguments[2]) &&
                body[0].expression.arguments[2].properties.length === 2 &&
                body[0].expression.arguments[2].properties.every(t.isObjectProperty) &&
                t.isIdentifier(body[0].expression.arguments[2].properties[0].key, { name: "value" }) &&
                t.isIdentifier(body[0].expression.arguments[2].properties[0].value, { name: params[1].left.name }) &&
                t.isIdentifier(body[0].expression.arguments[2].properties[1].key, { name: "configurable" }) &&
                t.isBooleanLiteral(body[0].expression.arguments[2].properties[1].value, { value: false }) &&
                t.isReturnStatement(body[1]) &&
                body[1].argument &&
                t.isIdentifier(body[1].argument, { name: params[0].name })
            ))
                return;

            if (isNotEstimate) {
                const { scope: parentScope } = parentPath;

                const parentNameBinding = parentScope.getBinding(name);
                if (!parentNameBinding)
                    return;

                const { referencePaths: parentNameBindingReferencePaths } =
                    parentNameBinding;

                parentNameBindingReferencePaths.forEach(innerPath => {
                    const { parent: innerParent, parentPath: innerParentPath } = innerPath;

                    const { parentPath: innerParentParentPath } = innerParentPath;

                    if (t.isCallExpression(innerParent)) {
                        const { arguments: { length: innerParentArgumentsLength } } = innerParent;

                        if (innerParentArgumentsLength === 1 || innerParentArgumentsLength === 2) {
                            const isArgumentsLengthOne = innerParentArgumentsLength === 1;

                            if (innerParentParentPath.isExpressionStatement()) {
                                innerParentParentPath.remove();
                            } else if (t.isExpression(innerParent.arguments[0])) // Currently same with any arguments length, but we'll handle this later
                                innerParentPath.replaceWith(innerParent.arguments[0]);

                            console.log("Simplified arguments length set function call, length:", innerParentArgumentsLength);
                        }
                    }
                });

                path.remove();

                console.log("Removed arguments length set function:", name);

                context.targetCount--;
            } else
                context.targetCount++;
        },
    };
};

const webcrackAST = async (ast: parser.ParseResult) => {
    const { code: generatedASTCode } = generate(ast);

    const { code: webcrackedGeneratedASTCode } = await webcrack(generatedASTCode, {
        jsx: false,
        unpack: false,
    });

    // TODO: progrss bar for webcrack

    ast.program = parser.parse(webcrackedGeneratedASTCode).program;
};

/**
 * Apply all transforms to parse result.
 * 
 * @remarks
 * This changes caller's value.
 */
export async function transform(ast: parser.ParseResult, verbose: boolean = true) {
    const visitorsExecutors = new Array<() => Promise<void>>;

    const firstVisitors = new Map<string, EstimableVisitor>;
    const finalVisitors = new Map<string, EstimableVisitor>;

    let singleProgressBar: cliProgress.SingleBar | null = null;

    const backingTransformContext: TransformContext = {
        targetCount: 0,
    };

    let isTransformRunning = false;

    let initialTargetCount = 0;

    const transformContext = new Proxy(backingTransformContext, {
        set(target, p, newValue, receiver) {
            target[p] = newValue;

            if (verbose && isTransformRunning && p === "targetCount") {
                const newValueNumbered: number = newValue;

                const progress = initialTargetCount - newValueNumbered;

                singleProgressBar?.update(progress);
            }

            return true;
        },
    });

    let unpatchConsoleLog: () => void = null;

    if (verbose) {
        singleProgressBar = new cliProgress.SingleBar({
            format: "{bar} | {value}/{total} | {transformName}",
            stream: process.stdout,
            barCompleteChar: "\u2588",
            barIncompleteChar: "\u2591",
            hideCursor: true,
            forceRedraw: true,
        });

        unpatchConsoleLog = (function () {
            // Required for fuckin' position issue
            console.clear();

            const originalLog = console.log;

            console.log = (...data: Array<any>) => {
                readline.clearLine(process.stdout, 0);
                readline.cursorTo(process.stdout, 0);

                originalLog(...data);

                singleProgressBar?.render();
            };

            return () => console.log = originalLog;
        })();
    } else
        unpatchConsoleLog = (function () {
            const originalLog = console.log;

            console.log = () => { };

            return () => console.log = originalLog;
        })();

    /**
     * Estimated traverse.
     */
    const traverseASTEstimate = (visitor: EstimableVisitor) => {
        transformContext.targetCount = 0;

        traverse(ast, visitor(true));
    };

    /**
     * Traverse with console-grouped, and progressed.
     */
    const traverseASTProgressed = async (visitor: EstimableVisitor, transformName: string) => {
        // Estimate first
        traverseASTEstimate(visitor);

        if (verbose)
            console.log(`Running transform: ${transformName}`);

        { // Run transform
            if (verbose)
                console.group();

            initialTargetCount = transformContext.targetCount;

            if (initialTargetCount > 0) {
                if (verbose) {
                    singleProgressBar?.setTotal(initialTargetCount + 1);
                    singleProgressBar?.update(0, { transformName });
                }

                { // Run transform
                    isTransformRunning = true;

                    traverse(ast, visitor(false));

                    // This makes progress bar more beautiful
                    if (verbose)
                        await new Promise(resolve => setTimeout(resolve, 50));

                    // To at least show 10ms completed progress bar
                    transformContext.targetCount++;

                    isTransformRunning = false;
                }
            } else {
                if (verbose) {
                    // Do these before, so console.log can show this properly
                    singleProgressBar?.setTotal(1);
                    singleProgressBar?.update(0, { transformName: `${transformName} (Skipped)` });

                    console.log("No targets found");
                }
            }

            if (verbose)
                console.groupEnd();
        }
    };

    try {
        if (verbose)
            singleProgressBar?.start(1, 0, { transformName: "Starting..." });

        for (const {
            name,
            preRunWebcrack,
            postRunWebcrack,
            contextedVisitor,
        } of ALL_TRANSFORMS) {
            const {
                on,
                pre,
                post,

                first,
                final,
            } = contextedVisitor(transformContext);

            visitorsExecutors.push(async () => {
                if (preRunWebcrack)
                    await webcrackAST(ast);

                if (pre) // Run pre-visitor
                    await traverseASTProgressed(pre, `${name} (Pre)`);

                // Run on-visitor
                await traverseASTProgressed(on, name);

                if (post) // Run post-visitor
                    await traverseASTProgressed(post, `${name} (Post)`);

                if (postRunWebcrack)
                    await webcrackAST(ast);
            });

            if (first) // Push final visitor
                firstVisitors.set(name, first);

            if (final) // Push final visitor
                finalVisitors.set(name, final);
        }

        for (const [name, visitor] of firstVisitors) // Execute first visitors
            await traverseASTProgressed(visitor, `${name} (First)`);

        // Execute visitors executors
        for (const visitorsExecutor of visitorsExecutors)
            await visitorsExecutor();

        for (const [name, visitor] of finalVisitors) // Execute final visitors
            await traverseASTProgressed(visitor, `${name} (Final)`);

        if (verbose)
            singleProgressBar?.update(singleProgressBar.getTotal(), { transformName: "Completed" });
    } finally {
        unpatchConsoleLog();

        if (verbose) {
            singleProgressBar?.stop();

            // This makes next console.log position correct (removes progress bar)
            readline.cursorTo(process.stdout, 0, process.stdout.rows - 1);
        }
    }
}

// TODO: make all shared estimable visitor return set of it target, and force require delete for each of transforms,
// thus a transform can averagely log
export type SharedEstimableVisitor = (context: TransformContext) => EstimableVisitor;

export type EstimableVisitor = (isEstimate: boolean) => Visitor;

export interface Transform {
    name: string;
    preRunWebcrack: boolean;
    postRunWebcrack: boolean;
    contextedVisitor: (context: TransformContext) => {
        on: EstimableVisitor;
        pre: EstimableVisitor | null;
        post: EstimableVisitor | null;

        first: EstimableVisitor | null;
        final: EstimableVisitor | null;
    };
}

export interface TransformContext {
    targetCount: number;
}
