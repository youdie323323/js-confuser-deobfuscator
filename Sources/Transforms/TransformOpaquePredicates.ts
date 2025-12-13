import type { SharedEstimableVisitor, Transform } from "./Transform";
import * as t from "@babel/types";
import type { NodePath, Visitor } from "@babel/traverse";
import generate from "@babel/generator";

function isPredicateFunctionDeclaration(functionDeclaration: t.FunctionDeclaration): functionDeclaration is t.FunctionDeclaration & {
    body: t.BlockStatement & {
        body: [];
    };
} {
    const { body } = functionDeclaration;

    return body.body.length === 0;
}

export function isPredicate(path: NodePath): boolean {
    if (!path.isBinaryExpression({ operator: "in" }))
        return false;

    const leftPath = path.get("left");
    const rightPath = path.get("right");

    if (!leftPath.isStringLiteral() || !rightPath.isIdentifier())
        return false;

    const { scope } = path;

    const rightNameBinding = scope.getBinding(rightPath.node.name);
    if (!rightNameBinding)
        return false;

    const { path: nameBindingPath } = rightNameBinding;

    if (nameBindingPath.isFunctionDeclaration())
        return isPredicateFunctionDeclaration(nameBindingPath.node);

    return false;
}

export function isFalsePredicate(path: NodePath): boolean {
    if (path.isUnaryExpression())
        return false;

    return isPredicate(path);
}

export function isTruePredicate(path: NodePath): boolean {
    if (!path.isUnaryExpression({ operator: "!" }))
        return false;

    const argumentPath = path.get("argument");

    return isPredicate(argumentPath);
}

export const transformPredicateFunctionDeclarationRemoval: SharedEstimableVisitor = context => isEstimate => {
    const isNotEstimate = !isEstimate;

    return {
        FunctionDeclaration(path) {
            const { node, node: { id: { name } }, scope } = path;

            if (isPredicateFunctionDeclaration(node))
                if (isNotEstimate) {
                    const binding = scope.getBinding(name);
                    if (binding)
                        path.remove();

                    console.log("Removed predicate function:", name);

                    context.targetCount--;
                } else
                    context.targetCount++;
        },
    };
};

export default {
    name: "OpaquePredicates",
    preRunWebcrack: false,
    postRunWebcrack: false,
    contextedVisitor: context => {
        return {
            on: isEstimate => {
                const isNotEstimate = !isEstimate;

                return {
                    // PREDICATE() && test => test
                    LogicalExpression(path) {
                        const { node } = path;

                        if (node.operator !== "&&") return;

                        const leftPath = path.get("left");

                        if (isTruePredicate(leftPath))
                            if (isNotEstimate) {
                                const { right } = node;

                                path.replaceWith(right);

                                { // Log
                                    const { code: nodeCode } = generate(node);
                                    const { code: nodeRightCode } = generate(right);

                                    console.log(`Simplified opaque logical expression: "${nodeCode}" => "${nodeRightCode}"`);
                                }

                                context.targetCount--;
                            } else
                                context.targetCount++;
                    },

                    // if (PREDICATE()) { return real; } else { return fake; } => return real;
                    IfStatement(path) {
                        const { node } = path;

                        const testPath = path.get("test");

                        if (isTruePredicate(testPath))
                            if (isNotEstimate) {
                                const { consequent, test: innerTest } = node;

                                if (t.isBlockStatement(consequent))
                                    path.replaceWithMultiple(consequent.body);
                                else
                                    path.replaceWith(consequent);

                                { // Log
                                    const { code: innerTestCode } = generate(innerTest);

                                    console.log(`Simplified opaque if: "${innerTestCode}" => true`);
                                }

                                context.targetCount--;
                            } else
                                context.targetCount++;
                    },
                };
            },
            pre: null,
            post: null, // transformConstantPredicateFunctionDeclarationRemoval, // Don't do this for DeadCode

            first: null,
            final: null,
        };
    },
} satisfies Transform;