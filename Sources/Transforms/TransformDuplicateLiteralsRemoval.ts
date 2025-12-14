import type { Transform } from "./Transform";
import * as t from "@babel/types";

export type UndefinedIdentifier = t.Identifier & {
    name: "undefined";
};

export function isUndefinedIdentifier(node: t.Node): node is UndefinedIdentifier {
    return t.isIdentifier(node, { name: "undefined" });
}

function isJsConfuserDuplicateLiteralsRemovalNode(node: t.Node):
    node is t.StringLiteral | t.BooleanLiteral | t.NumericLiteral | t.NullLiteral | UndefinedIdentifier {
    return t.isStringLiteral(node) ||
        t.isBooleanLiteral(node) ||
        t.isNumericLiteral(node) ||
        t.isNullLiteral(node) ||
        isUndefinedIdentifier(node);
}

export default {
    name: "DuplicateLiteralsRemoval",
    preRunWebcrack: false,
    postRunWebcrack: true,
    contextedVisitor: context => {
        return {
            on: isEstimate => {
                const isNotEstimate = !isEstimate;

                return {
                    VariableDeclaration(path) {
                        const { node: { declarations }, scope } = path;

                        declarations.forEach(declaration => {
                            if (
                                declaration.id &&
                                t.isIdentifier(declaration.id) &&
                                declaration.init &&
                                t.isArrayExpression(declaration.init)
                            ) {
                                const { init: { elements: declarationInitElements } } = declaration;

                                if (
                                    declarationInitElements.length > 0 &&
                                    declarationInitElements.every(isJsConfuserDuplicateLiteralsRemovalNode)
                                ) {
                                    const { id: { name: declarationName } } = declaration;

                                    if (isNotEstimate)
                                        console.log("Detected literals array:", declarationName);

                                    const pathBinding = scope.getBinding(declarationName);
                                    if (pathBinding) {
                                        const { referencePaths: pathBindingReferencePaths } = pathBinding;

                                        let haveBeenReversedLiteral = true;

                                        pathBindingReferencePaths.forEach(({ parent: innerParent, parentPath: innerParentPath }) => {
                                            if (
                                                // TODO: this for targetCount
                                                t.isMemberExpression(innerParent) &&
                                                t.isNumericLiteral(innerParent.property)
                                            )
                                                if (isNotEstimate) {
                                                    innerParentPath.replaceWith(declarationInitElements[innerParent.property.value]);

                                                    haveBeenReversedLiteral = true;

                                                    context.targetCount--;
                                                } else
                                                    context.targetCount++;
                                        });

                                        if (isNotEstimate)
                                            if (haveBeenReversedLiteral) {
                                                console.log(`Reversed ${pathBindingReferencePaths.length} literals`);

                                                // Remove literals array
                                                path.remove();

                                                console.log("Removed literals array:", declarationName);
                                            } else
                                                console.log("Array has no references, do nothing");
                                    }
                                }
                            }
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