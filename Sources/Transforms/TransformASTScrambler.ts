import type { Transform } from "./Transform";
import * as t from "@babel/types";

export default {
    name: "ASTScrambler",
    postRunWebcrack: true, // We transform minify with this
    scopableVisitor: () => {
        return {
            on: {
                Program(path) {
                    let scramblerFunctionName: string = null;

                    path.traverse({
                        FunctionDeclaration(innerPath) {
                            const { node: { id, body: { body: bodyBody } } } = innerPath;

                            if (bodyBody.length !== 1)
                                return;

                            const { 0: bodyBodyFirstStatement } = bodyBody;

                            if (!(
                                t.isExpressionStatement(bodyBodyFirstStatement) &&
                                t.isAssignmentExpression(bodyBodyFirstStatement.expression)
                            ))
                                return;

                            const { expression: bodyBodyFirstStatementExpression } = bodyBodyFirstStatement;

                            if (!(
                                t.isIdentifier(bodyBodyFirstStatementExpression.left, { name: id.name }) &&
                                t.isFunctionExpression(bodyBodyFirstStatementExpression.right)
                            ))
                                return;

                            scramblerFunctionName = id.name;

                            // We won't need scrambler function
                            innerPath.remove();
                            innerPath.stop();
                        },
                    });

                    if (!scramblerFunctionName) // If scrambler function name not detected, return
                        return;

                    path.traverse({
                        ExpressionStatement(innerPath) {
                            const { node: { expression } } = innerPath;

                            if (!(
                                t.isCallExpression(expression) &&
                                t.isIdentifier(expression.callee, { name: scramblerFunctionName })
                            ))
                                return;

                            const { arguments: ownArguments } = expression;

                            const argumentsFlattened =
                                ownArguments.map(argument => t.expressionStatement(argument as t.Expression));

                            innerPath.replaceWithMultiple(argumentsFlattened);
                        },
                    });
                },
            },
            pre: null,

            final: null,
        };
    },
} satisfies Transform;