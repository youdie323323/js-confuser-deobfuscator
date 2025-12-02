import type { NodePath } from "@babel/traverse";
import type { Transform } from "./Transform";
import * as t from "@babel/types";

function isUnshuffleFunctionDeclaration(node: t.FunctionDeclaration): boolean {
    const { params } = node;

    if (
        // >= for movedDeclaration
        params.length >= 2 &&
        t.isIdentifier(params[0]) &&
        t.isIdentifier(params[1]) &&
        t.isBlockStatement(node.body)
    ) {
        const { body: { body: nodeBodyBody } } = node;

        if (
            nodeBodyBody.length >= 2 &&
            t.isForStatement(nodeBodyBody[0])
        ) {
            const arrayParamName = params[0].name;

            const nodeBodyBodyReturnStatement = nodeBodyBody[nodeBodyBody.length - 1];

            if (
                t.isReturnStatement(nodeBodyBodyReturnStatement) &&
                t.isIdentifier(nodeBodyBodyReturnStatement.argument, { name: arrayParamName }) &&
                t.isIdentifier(node.id)
            )
                return true;
        }
    }

    return false;
}

export default {
    name: "Shuffle",
    postRunWebcrack: false,
    scopableVisitor: () => {
        let unshuffleFunctionDeclarationPath: NodePath<t.FunctionDeclaration>;

        return {
            on: {
                CallExpression(path) {
                    const { node } = path;
                    const { callee, arguments: ourArguments } = node;

                    if (
                        ourArguments.length === 2 &&
                        t.isIdentifier(callee)
                    ) {
                        const calleeBinding = path.scope.getBinding(callee.name);

                        if (
                            calleeBinding &&
                            calleeBinding.path.isFunctionDeclaration() &&
                            (calleeBinding.path === unshuffleFunctionDeclarationPath || isUnshuffleFunctionDeclaration(calleeBinding.path.node))
                        ) {
                            const { 0: arrayArgument, 1: shiftArgument } = ourArguments;

                            if (
                                t.isArrayExpression(arrayArgument) &&
                                t.isNumericLiteral(shiftArgument)
                            ) {
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
                            }
                        }
                    }
                },
            },
            pre: null,

            final: {
                Program: {
                    exit() {
                        if (unshuffleFunctionDeclarationPath)
                            unshuffleFunctionDeclarationPath.remove();
                    },
                },
            },
        };
    },
} satisfies Transform;