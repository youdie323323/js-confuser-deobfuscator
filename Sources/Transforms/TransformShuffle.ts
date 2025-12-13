import type { NodePath } from "@babel/traverse";
import type { Transform } from "./Transform";
import * as t from "@babel/types";

function isUnshuffleFunctionDeclaration(functionDeclaration: t.FunctionDeclaration): boolean {
    const { params } = functionDeclaration;

    if (
        // >= for movedDeclaration
        params.length >= 2 &&
        t.isIdentifier(params[0]) &&
        t.isIdentifier(params[1]) &&
        t.isBlockStatement(functionDeclaration.body)
    ) {
        const { body: { body: nodeBodyBody } } = functionDeclaration;

        if (
            nodeBodyBody.length >= 2 &&
            t.isForStatement(nodeBodyBody[0])
        ) {
            const { name: arrayParamName } = params[0];

            const nodeBodyBodyReturnStatement = nodeBodyBody[nodeBodyBody.length - 1];

            if (
                t.isReturnStatement(nodeBodyBodyReturnStatement) &&
                t.isIdentifier(nodeBodyBodyReturnStatement.argument, { name: arrayParamName }) &&
                t.isIdentifier(functionDeclaration.id)
            )
                return true;
        }
    }

    return false;
}

export default {
    name: "Shuffle",
    preRunWebcrack: false,
    postRunWebcrack: false,
    contextedVisitor: context => {
        let unshuffleFunctionDeclarationPath: NodePath<t.FunctionDeclaration>;

        return {
            on: isEstimate => {
                const isNotEstimate = !isEstimate;

                return {
                    CallExpression(path) {
                        const { node: { callee, arguments: ourArguments }, scope } = path;

                        if (
                            ourArguments.length === 2 &&
                            t.isIdentifier(callee)
                        ) {
                            const { name: calleeName } = callee;

                            const calleeBinding = scope.getBinding(calleeName);

                            if (
                                calleeBinding &&
                                calleeBinding.path.isFunctionDeclaration() &&
                                (calleeBinding.path === unshuffleFunctionDeclarationPath || isUnshuffleFunctionDeclaration(calleeBinding.path.node))
                            ) {
                                if (isNotEstimate)
                                    console.log("Detected shuffle function name:", calleeName);

                                const { 0: arrayArgument, 1: shiftArgument } = ourArguments;

                                if (
                                    t.isArrayExpression(arrayArgument) &&
                                    t.isNumericLiteral(shiftArgument)
                                ) {
                                    if (isNotEstimate) {
                                        const { value: shiftArgumentValue } = shiftArgument;

                                        const arrayArgumentElementsCopied = arrayArgument.elements.slice(0);

                                        for (let i = 0; i < shiftArgumentValue; i++) {
                                            const first = arrayArgumentElementsCopied.shift();
                                            if (first)
                                                arrayArgumentElementsCopied.push(first);
                                        }

                                        path.replaceWith(t.arrayExpression(arrayArgumentElementsCopied));

                                        if (!unshuffleFunctionDeclarationPath)
                                            unshuffleFunctionDeclarationPath = calleeBinding.path;

                                        { // Log
                                            console.log("Unshuffled array, shift:", shiftArgumentValue);
                                        }

                                        context.targetCount--;
                                    } else
                                        context.targetCount++;
                                }
                            }
                        }
                    },
                };
            },
            pre: null,
            post: isEstimate => {
                const isNotEstimate = !isEstimate;

                return {
                    Program() {
                        if (unshuffleFunctionDeclarationPath) {
                            const { node: unshuffleFunctionDeclaration } = unshuffleFunctionDeclarationPath;

                            if (isNotEstimate) {
                                unshuffleFunctionDeclarationPath.remove();

                                if (unshuffleFunctionDeclaration.id)
                                    console.log("Removed unshuffle function:", unshuffleFunctionDeclaration.id.name);

                                context.targetCount--;
                            } else
                                context.targetCount++;
                        }
                    },
                };
            },

            first: null,
            final: null,
        };
    },
} satisfies Transform;