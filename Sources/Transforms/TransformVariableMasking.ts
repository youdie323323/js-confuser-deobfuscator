import { transformFunctionLengthSetterRemoval, type Transform } from "./Transform";
import type { NodePath } from "@babel/traverse";
import * as t from "@babel/types";
import { isNumericLiteralOrMinusNumericUnaryExpression, numericLiteralOrMinusNumericUnaryExpressionToValue } from "./TransformControlFlowFlattening";
import traverse from "@babel/traverse";

type ArgumentsMemberKey = string | number;

type ArgumentsMemberType = "param" | "variable";

interface ArgumentsMember {
    type: ArgumentsMemberType;
    name: string;
    assignmentPath: NodePath<t.AssignmentExpression> | null;
}

export const containerContainsExpression = (containerPath: NodePath, targetNode: t.Node): boolean => {
    const { node: container } = containerPath;

    const { node: containerPathFunctionParentNode } = containerPath.getFunctionParent();

    if (t.isNodesEquivalent(container, targetNode))
        return true;

    let found = false;

    traverse(container, {
        enter(path) {
            const pathFunctionParent = path.getFunctionParent();

            if (
                ( // Eliminate slowly-evalutable case
                    pathFunctionParent &&
                    t.isNodesEquivalent(containerPathFunctionParentNode, pathFunctionParent.node)
                ) &&
                t.isNodesEquivalent(path.node, targetNode)
            ) {
                found = true;

                path.stop();
            }
        },
        noScope: true,
    });

    return found;
};

export default {
    name: "VariableMasking",
    preRunWebcrack: false,
    postRunWebcrack: false,
    contextedVisitor: context => ({
        on: isEstimate => {
            const isNotEstimate = !isEstimate;

            return {
                Function(path) {
                    const { node, node: { params }, scope } = path;

                    if (params.length !== 1 || !t.isRestElement(params[0]))
                        return;

                    const { 0: { argument: restParamArgument } } = params;

                    if (!t.isIdentifier(restParamArgument))
                        return;

                    const { name: restParamArgumentName } = restParamArgument;

                    const restParamArgumentNameBinding = scope.getBinding(restParamArgumentName);
                    if (!restParamArgumentNameBinding)
                        return;

                    const pathsToRemove: Array<NodePath> = new Array;

                    const indexToArgumentsMember: Map<ArgumentsMemberKey, ArgumentsMember> = new Map;

                    const collectArgumentsMember =
                        (skipNested: boolean) => path.traverse({
                            MemberExpression(innerPath) {
                                const { node: innerNode, scope: innerScope } = innerPath;

                                { // Check function parent
                                    const { node: innerPathFunctionParentNode } = innerPath.getFunctionParent();

                                    if (t.isNodesEquivalent(innerPathFunctionParentNode, node) !== skipNested)
                                        return;
                                }

                                const { object: innerObject, property: innerProperty } = innerNode;

                                if (!t.isIdentifier(innerObject, { name: restParamArgumentName }))
                                    return;

                                const innerRestParamArgumentNameBinding = innerScope.getBinding(restParamArgumentName);
                                if (innerRestParamArgumentNameBinding !== restParamArgumentNameBinding)
                                    return;

                                const { parentPath: innerPathParentPath } = innerPath;

                                const isWrite =
                                    innerPathParentPath.isAssignmentExpression() &&
                                    innerPathParentPath.get("left") === innerPath;

                                const isLengthWritePropertyKeyName =
                                    (name: string) =>
                                        skipNested /* Length write statement only appear on target function */ &&
                                        isWrite &&
                                        name === "length";

                                let argumentsMemberKey: ArgumentsMemberKey;

                                if (innerNode.computed)
                                    if (t.isStringLiteral(innerProperty)) {
                                        argumentsMemberKey = innerProperty.value;

                                        if (isLengthWritePropertyKeyName(argumentsMemberKey)) {
                                            pathsToRemove.push(innerPathParentPath.parentPath);

                                            return;
                                        }
                                    } else if (isNumericLiteralOrMinusNumericUnaryExpression(innerProperty))
                                        argumentsMemberKey = numericLiteralOrMinusNumericUnaryExpressionToValue(innerProperty);
                                    else
                                        return;
                                else if (t.isIdentifier(innerProperty)) {
                                    if (isLengthWritePropertyKeyName(innerProperty.name)) {
                                        pathsToRemove.push(innerPathParentPath.parentPath);

                                        return;
                                    }

                                    argumentsMemberKey = innerProperty.name;
                                } else
                                    return;

                                if (!indexToArgumentsMember.has(argumentsMemberKey)) {
                                    let type: ArgumentsMemberType = "param";

                                    if (isWrite) {
                                        const innerPathParentRightPath = innerPathParentPath.get("right");

                                        // If the assignment doesn't reference itself, it's a variable
                                        if (!containerContainsExpression(innerPathParentRightPath, innerNode))
                                            type = "variable";
                                        else if (isNotEstimate)
                                            console.log(`Arguments member key ${argumentsMemberKey} self referencing, decided as parameter`);
                                    }

                                    const { name } =
                                        type === "variable"
                                            ? scope.generateUidIdentifier(`var_${argumentsMemberKey}`)
                                            : scope.generateUidIdentifier(`param_${argumentsMemberKey}`);

                                    if (isNotEstimate)
                                        console.log(`Arguments member key ${argumentsMemberKey} type name:`, name);

                                    indexToArgumentsMember.set(argumentsMemberKey, { type, name, assignmentPath: null });
                                }

                                const argumentsMember = indexToArgumentsMember.get(argumentsMemberKey);

                                if (argumentsMember.type === "variable" && isWrite)
                                    if (!argumentsMember.assignmentPath)
                                        if (innerPathParentPath.isAssignmentExpression())
                                            argumentsMember.assignmentPath = innerPathParentPath;
                            },
                        });

                    // Collect same function-parent statements first, then collect inners
                    collectArgumentsMember(true);
                    collectArgumentsMember(false);

                    if (
                        pathsToRemove.length === 0 &&
                        indexToArgumentsMember.size === 0
                    ) { // Normal spread... return
                        if (isNotEstimate)
                            console.log("Normal spread function detected, returning");

                        return;
                    }

                    if (isNotEstimate)
                        pathsToRemove.forEach(path => path.remove());

                    path.traverse({
                        MemberExpression(innerPath) {
                            if (isEstimate)
                                return;

                            const { node: innerNode, scope: innerScope } = innerPath;

                            const { object: innerObject, property: innerProperty } = innerNode;

                            if (!t.isIdentifier(innerObject, { name: restParamArgumentName }))
                                return;

                            const innerRestParamArgumentNameBinding = innerScope.getBinding(restParamArgumentName);
                            if (innerRestParamArgumentNameBinding !== restParamArgumentNameBinding)
                                return;

                            let argumentsMemberKey: string | number;

                            if (innerNode.computed) {
                                if (t.isStringLiteral(innerProperty) && innerProperty.value !== "length")
                                    argumentsMemberKey = innerProperty.value;
                                else if (isNumericLiteralOrMinusNumericUnaryExpression(innerProperty))
                                    argumentsMemberKey = numericLiteralOrMinusNumericUnaryExpressionToValue(innerProperty);
                                else
                                    return;
                            } else if (t.isIdentifier(innerProperty) && innerProperty.name !== "length")
                                argumentsMemberKey = innerProperty.name;
                            else
                                return;

                            if (argumentsMemberKey !== undefined && indexToArgumentsMember.has(argumentsMemberKey)) {
                                const argumentsMember = indexToArgumentsMember.get(argumentsMemberKey);

                                innerPath.replaceWith(t.identifier(argumentsMember.name));
                            }
                        },
                    });

                    if (isNotEstimate) {
                        const predictedParamLength = Math.max(
                            -1,
                            ...Array.from(indexToArgumentsMember.entries())
                                .filter(([key, value]) => value.type === "param" && typeof key === "number")
                                .map(([key]) => key as number),
                        );

                        console.log(`Predicted function parameter length:`, predictedParamLength + 1);

                        const restoredParams: Array<t.Identifier> = new Array;

                        for (let i = 0; i <= predictedParamLength; i++) {
                            const iArgumentsMember = indexToArgumentsMember.get(i);

                            if (iArgumentsMember) {
                                if (iArgumentsMember.type === "param") // Not do anything with variable
                                    restoredParams.push(t.identifier(iArgumentsMember.name));
                            } else
                                restoredParams.push(scope.generateUidIdentifier("unused"));
                        }

                        node.params = restoredParams;

                        const variables =
                            Array.from(indexToArgumentsMember.values())
                                .filter(value => value.type === "variable");

                        const declarationsToPrepend: Array<t.VariableDeclarator> = new Array;

                        // Variable masking doesn't transform "const", so we can always use "let"

                        for (const variable of variables) {
                            const { assignmentPath: variableAssignmentPath, name: variableName } = variable;

                            let merged = false;

                            if (variableAssignmentPath) {
                                const {
                                    parentPath: variableAssignmentPathParentPath,
                                    node: variableAssignmentPathNode,
                                } = variableAssignmentPath;

                                const newDeclaration = t.variableDeclaration("let", [
                                    t.variableDeclarator(
                                        t.identifier(variableName),
                                        variableAssignmentPathNode.right,
                                    ),
                                ]);

                                if (variableAssignmentPathParentPath.isExpressionStatement()) {
                                    variableAssignmentPathParentPath.replaceWith(newDeclaration);

                                    merged = true;
                                } else if (
                                    // TODO: guess there's more
                                    (variableAssignmentPathParentPath.isForStatement() && variableAssignmentPath.key === "init") ||
                                    (variableAssignmentPathParentPath.isForXStatement() && variableAssignmentPath.key === "left")
                                ) {
                                    variableAssignmentPath.replaceWith(newDeclaration);

                                    merged = true;
                                }
                            }

                            if (merged)
                                console.log(`Merged variable ${variableName} into let`);
                            else {
                                declarationsToPrepend.push(t.variableDeclarator(t.identifier(variableName)));

                                console.log(`Unable to merge variable ${variableName}, normally declares non-init lets`);
                            }
                        }

                        if (declarationsToPrepend.length > 0)
                            if (t.isBlockStatement(node.body))
                                node.body.body.unshift(
                                    t.variableDeclaration("let", declarationsToPrepend),
                                );

                        context.targetCount--;
                    } else
                        context.targetCount++;
                },
            };
        },
        pre: null,
        post: transformFunctionLengthSetterRemoval(context),

        first: null,
        final: null,
    }),
} satisfies Transform;