import type { Transform } from "./Transform";
import * as t from "@babel/types";

export default {
    name: "ASTScrambler",
    preRunWebcrack: false,
    postRunWebcrack: true, // We transform minify with this
    contextedVisitor: context => {
        return {
            on: isEstimate => {
                const isNotEstimate = !isEstimate;

                return {
                    Program(path) {
                        let scramblerFunctionName: string = null;

                        path.traverse({
                            FunctionDeclaration(innerPath) {
                                const { node: { id, body: { body } } } = innerPath;

                                if (body.length !== 1)
                                    return;

                                const { 0: bodyFirstStatement } = body;

                                if (!(
                                    t.isExpressionStatement(bodyFirstStatement) &&
                                    t.isAssignmentExpression(bodyFirstStatement.expression)
                                ))
                                    return;

                                const { expression: bodyFirstStatementExpression } = bodyFirstStatement;

                                if (!(
                                    t.isIdentifier(bodyFirstStatementExpression.left, { name: id.name }) &&
                                    t.isFunctionExpression(bodyFirstStatementExpression.right)
                                ))
                                    return;

                                scramblerFunctionName = id.name;

                                if (isNotEstimate) // We don't need scrambler function
                                    innerPath.remove();

                                innerPath.stop();
                            },
                        });

                        if (!scramblerFunctionName) // If scrambler function name not detected, return
                            return;

                        if (isNotEstimate)
                            console.log("Detected scrambler function name:", scramblerFunctionName);

                        path.traverse({
                            ExpressionStatement(innerPath) {
                                const { node: { expression } } = innerPath;

                                if (!(
                                    t.isCallExpression(expression) &&
                                    t.isIdentifier(expression.callee, { name: scramblerFunctionName })
                                ))
                                    return;

                                if (isNotEstimate) {
                                    const { arguments: ownArguments } = expression;

                                    const argumentsFlattened =
                                        ownArguments.map(argument => t.expressionStatement(argument as t.Expression));

                                    innerPath.replaceWithMultiple(argumentsFlattened);

                                    { // Log
                                        console.log(`Expanded ${argumentsFlattened.length} statements`);
                                    }

                                    context.targetCount--;
                                } else
                                    context.targetCount++;
                            },
                        });
                    },
                };
            },
            pre: null,
            post: null,

            first: null,
            final: null,
        };
    },
} satisfies Transform;