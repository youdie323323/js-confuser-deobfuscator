import type { Transform } from "./Transform";
import * as t from "@babel/types";
import * as parser from "@babel/parser";

function truncateString(string: string, n: number) {
    return string.length > n
        ? string.slice(0, n) + "..."
        : string;
}

interface PackPseudoGlobalEntry {
    getter?: {
        expression: t.Expression;
    };
    setter?: {
        target: t.AssignmentExpression["left"];
    };
}

export default {
    name: "Pack",
    preRunWebcrack: true, // First webcrack
    postRunWebcrack: true, // Simplify unpacked program
    contextedVisitor: context => {
        let pseudoGlobalEntriesObjectName: string;

        const keyToPseudoGlobalEntry = new Map<string, PackPseudoGlobalEntry>;

        return {
            on(isEstimate) {
                const isNotEstimate = !isEstimate;

                return {
                    Program(path) {
                        const { node: { body } } = path;

                        // Considering imports, get last statement
                        const lastStatement = body[body.length - 1];

                        if (
                            t.isExpressionStatement(lastStatement) &&
                            t.isCallExpression(lastStatement.expression) &&
                            t.isCallExpression(lastStatement.expression.callee) &&
                            t.isIdentifier(lastStatement.expression.callee.callee, { name: "Function" }) &&
                            lastStatement.expression.arguments.length === 1 &&
                            lastStatement.expression.callee.arguments.length === 2
                        ) {
                            const {
                                expression: {
                                    callee: { arguments: lastStatementCalleeArguments },
                                    arguments: lastStatementArguments,
                                },
                            } = lastStatement;

                            const {
                                0: lastStatementCalleeArgumentsFirst,
                                1: lastStatementCalleeArgumentsLast,
                            } = lastStatementCalleeArguments;

                            const { 0: lastStatementArgumentsLast } = lastStatementArguments;

                            if (
                                t.isStringLiteral(lastStatementCalleeArgumentsFirst) &&
                                t.isStringLiteral(lastStatementCalleeArgumentsLast) &&
                                t.isObjectExpression(lastStatementArgumentsLast)
                            )
                                if (isNotEstimate) {
                                    { // Setup final values
                                        pseudoGlobalEntriesObjectName = lastStatementCalleeArgumentsFirst.value;

                                        console.log("Psuedo global entries object name:", pseudoGlobalEntriesObjectName);

                                        lastStatementArgumentsLast.properties.forEach(property => {
                                            if (!t.isObjectMethod(property))
                                                return;

                                            let propertyKey: string;

                                            if (t.isStringLiteral(property.key))
                                                propertyKey = property.key.value;
                                            else if (t.isIdentifier(property.key))
                                                propertyKey = property.key.name;
                                            else
                                                return;

                                            const entry = keyToPseudoGlobalEntry.get(propertyKey) || {};

                                            const { body: { body: propertyBody }, kind } = property;

                                            if (propertyBody.length > 0) {
                                                const { 0: firstStatement } = propertyBody;

                                                if (
                                                    t.isReturnStatement(firstStatement) &&
                                                    firstStatement.argument
                                                ) {
                                                    if (isNotEstimate)
                                                        console.log("Entrying property:", propertyKey, "kind:", kind);

                                                    const { argument: firstStatementArgument } = firstStatement;

                                                    if (kind === "get")
                                                        entry.getter = {
                                                            expression: firstStatementArgument,
                                                        };
                                                } else if (kind === "set")
                                                    if (
                                                        t.isExpressionStatement(firstStatement) &&
                                                        t.isAssignmentExpression(firstStatement.expression)
                                                    )
                                                        entry.setter = {
                                                            target: firstStatement.expression.left,
                                                        };
                                            }

                                            keyToPseudoGlobalEntry.set(propertyKey, entry);
                                        });
                                    }

                                    const { value: lastStatementCalleeArgumentsLastValue } =
                                        lastStatementCalleeArgumentsLast;

                                    // Wrap in IIFE, since may lastStatementCalleeArgumentsLastValue has return
                                    const { program: lastStatementCalleeArgumentsLastValueParsedProgram } =
                                        parser.parse(`(function () { ${lastStatementCalleeArgumentsLastValue} })();`);

                                    path.replaceWith(lastStatementCalleeArgumentsLastValueParsedProgram);

                                    { // Log
                                        console.log("Unpacked the program:", `"${truncateString(lastStatementCalleeArgumentsLastValue, 50)}"`);
                                    }

                                    context.targetCount--;
                                } else
                                    context.targetCount++;
                        }
                    },
                };
            },
            pre: null,
            post: null,

            first: null,
            final(isEstimate) {
                const isNotEstimate = !isEstimate;

                return {
                    MemberExpression(path) {
                        if (!pseudoGlobalEntriesObjectName)
                            return;

                        const {
                            node,
                            node: { object, property },
                            parent,
                        } = path;

                        if (!t.isIdentifier(object, { name: pseudoGlobalEntriesObjectName }))
                            return;

                        let propertyName: string;

                        if (t.isStringLiteral(property))
                            propertyName = property.value;
                        else if (t.isIdentifier(property))
                            propertyName = property.name;
                        else
                            return;

                        const propertyNamePseudoGlobalEntry = keyToPseudoGlobalEntry.get(propertyName);
                        if (!propertyNamePseudoGlobalEntry)
                            return;

                        const isAssignmentTarget =
                            t.isAssignmentExpression(parent) &&
                            t.isNodesEquivalent(parent.left, node);

                        if (
                            isAssignmentTarget &&
                            propertyNamePseudoGlobalEntry.setter
                        ) {
                            if (isNotEstimate) {
                                const { setter: { target: propertyNamePseudoGlobalEntrySetterTarget } } =
                                    propertyNamePseudoGlobalEntry;

                                path.replaceWith(propertyNamePseudoGlobalEntrySetterTarget);

                                console.log("Replaced setter access:", propertyName);

                                context.targetCount--;
                            } else
                                context.targetCount++;
                        } else if (propertyNamePseudoGlobalEntry.getter) {
                            if (isNotEstimate) {
                                const { getter: { expression: propertyNamePseudoGlobalEntryGetterExpression } } =
                                    propertyNamePseudoGlobalEntry;

                                path.replaceWith(propertyNamePseudoGlobalEntryGetterExpression);

                                console.log("Replaced getter access:", propertyName);

                                context.targetCount--;
                            } else
                                context.targetCount++;
                        }
                    },
                };
            },
        };
    },
} satisfies Transform;