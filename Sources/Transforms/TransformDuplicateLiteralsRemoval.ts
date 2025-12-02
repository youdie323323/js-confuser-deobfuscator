import type { Transform } from "./Transform";
import * as t from "@babel/types";

type UndefinedIdentifier = t.Identifier & {
    name: "undefined";
};

function isExpressionUndefinedIdentifier(expression: t.Expression): expression is UndefinedIdentifier {
    return t.isIdentifier(expression, { name: "undefined" });
}

function isJsConfuserDuplicateLiteralsRemovalLiteral(expression: t.Expression):
    expression is t.StringLiteral | t.BooleanLiteral | t.NumericLiteral | t.NullLiteral | UndefinedIdentifier {
    return t.isStringLiteral(expression) ||
        t.isBooleanLiteral(expression) ||
        t.isNumericLiteral(expression) ||
        t.isNullLiteral(expression) ||
        isExpressionUndefinedIdentifier(expression);
}

export default {
    name: "DuplicateLiteralsRemoval",
    postRunWebcrack: false,
    scopableVisitor: () => {
        return {
            on: {
                VariableDeclaration(path) {
                    const { node, scope } = path;

                    if (node.declarations.length !== 1)
                        return;

                    const { 0: nodeDeclaration } = node.declarations;

                    if (
                        nodeDeclaration.id &&
                        t.isIdentifier(nodeDeclaration.id) &&
                        nodeDeclaration.init &&
                        t.isArrayExpression(nodeDeclaration.init)
                    ) {
                        const { init: { elements: nodeDeclarationInitElements } } = nodeDeclaration;

                        if (nodeDeclarationInitElements.every(element => t.isExpression(element) && isJsConfuserDuplicateLiteralsRemovalLiteral(element))) {
                            const pathBinding = scope.getBinding(nodeDeclaration.id.name);
                            if (pathBinding) {
                                pathBinding.referencePaths.forEach(innerPath => {
                                    if (
                                        t.isMemberExpression(innerPath.parent) &&
                                        t.isNumericLiteral(innerPath.parent.property)
                                    )
                                        innerPath.parentPath.replaceWith(nodeDeclarationInitElements[innerPath.parent.property.value]);
                                });

                                // Remove literals array
                                path.remove();
                            }
                        }
                    }
                },
            },
            pre: null,

            final: null,
        };
    },
} satisfies Transform;