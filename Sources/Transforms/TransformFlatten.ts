import { transformFunctionLengthSetterRemoval, type Transform } from "./Transform";
import * as t from "@babel/types";

const enum PseudoFlattenGetterType {
    GET,
    PROXY,
}

interface PseudoFlattenEntry {
    getter?: {
        type: PseudoFlattenGetterType.GET;
        expression: t.Expression;
    } | {
        type: PseudoFlattenGetterType.PROXY;
        functionId: t.Identifier;
    };
    setter?: {
        target: t.AssignmentExpression["left"];
    };
}

export default {
    name: "Flatten",
    preRunWebcrack: false,
    postRunWebcrack: false,
    contextedVisitor: context => {
        return {
            on: isEstimate => {
                const isNotEstimate = !isEstimate;

                return {
                    Function(path) {
                        const { node, scope } = path;

                        if (!t.isBlockStatement(node.body))
                            return;

                        const { body: { body } } = node;

                        if (body.length !== 2)
                            return;

                        const {
                            0: bodyFirstStatement,
                            1: bodySecondStatement,
                        } = body;

                        if (!(
                            t.isVariableDeclaration(bodyFirstStatement) &&
                            t.isReturnStatement(bodySecondStatement)
                        ))
                            return;

                        const { declarations: bodyFirstStatementDeclarations } = bodyFirstStatement;
                        if (bodyFirstStatementDeclarations.length !== 1)
                            return;

                        const { 0: { init: bodyFirstStatementDeclarationInit } } = bodyFirstStatementDeclarations;
                        if (!t.isObjectExpression(bodyFirstStatementDeclarationInit))
                            return;

                        const { argument: bodySecondStatementArgument } = bodySecondStatement;

                        if (!t.isCallExpression(bodySecondStatementArgument))
                            return;

                        if (!t.isIdentifier(bodySecondStatementArgument.callee))
                            return;

                        const { callee: { name: bodySecondStatementArgumentCalleeName } }
                            = bodySecondStatementArgument;

                        const bodySecondStatementArgumentCalleeNameBinding =
                            scope.getBinding(bodySecondStatementArgumentCalleeName);
                        if (!(
                            bodySecondStatementArgumentCalleeNameBinding &&
                            bodySecondStatementArgumentCalleeNameBinding.path.isFunctionDeclaration()
                        ))
                            return;

                        const { path: bodySecondStatementArgumentCalleeNameBindingPath } = bodySecondStatementArgumentCalleeNameBinding,
                            { node: bodySecondStatementArgumentCalleeNameBindingNode } = bodySecondStatementArgumentCalleeNameBindingPath;

                        const keyToPseudoEntry = new Map<string, PseudoFlattenEntry>;

                        bodyFirstStatementDeclarationInit.properties.forEach(property => {
                            if (!t.isObjectMethod(property)) return;

                            let propertyKey: string;

                            if (t.isStringLiteral(property.key))
                                propertyKey = property.key.value;
                            else if (t.isIdentifier(property.key))
                                propertyKey = property.key.name;
                            else
                                return;

                            const propertyKeyPseudoEntry = keyToPseudoEntry.get(propertyKey) || {};

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
                                        propertyKeyPseudoEntry.getter = {
                                            type: PseudoFlattenGetterType.GET,

                                            expression: firstStatementArgument,
                                        };
                                    else if (
                                        kind === "method" &&
                                        t.isCallExpression(firstStatementArgument) &&
                                        t.isIdentifier(firstStatementArgument.callee)
                                    )
                                        propertyKeyPseudoEntry.getter = {
                                            type: PseudoFlattenGetterType.PROXY,

                                            functionId: firstStatementArgument.callee,
                                        };
                                } else if (kind === "set")
                                    if (
                                        t.isExpressionStatement(firstStatement) &&
                                        t.isAssignmentExpression(firstStatement.expression)
                                    )
                                        propertyKeyPseudoEntry.setter = {
                                            target: firstStatement.expression.left,
                                        };
                            }

                            keyToPseudoEntry.set(propertyKey, propertyKeyPseudoEntry);
                        });

                        const {
                            body: { body: bodySecondStatementArgumentCalleeNameBindingNodeBody },
                        } = bodySecondStatementArgumentCalleeNameBindingNode;

                        const { params: { length: bodySecondStatementArgumentCalleeNameBindingNodeParamsLength } } =
                            bodySecondStatementArgumentCalleeNameBindingNode;

                        let bodySecondStatementArgumentCalleeNameBindingNodeCloned: t.FunctionDeclaration;

                        switch (bodySecondStatementArgumentCalleeNameBindingNodeParamsLength) {
                            case 0: {
                                // Use strict enabled, directives are not removed

                                if (t.isVariableDeclaration(bodySecondStatementArgumentCalleeNameBindingNodeBody[0])) {
                                    const argumentsArrayPattern =
                                        bodySecondStatementArgumentCalleeNameBindingNodeBody[0].declarations
                                            .find(
                                                ({ id }) =>
                                                    t.isArrayPattern(id) &&
                                                    id.elements.length === 2 &&
                                                    t.isArrayPattern(id.elements[0]) &&
                                                    t.isIdentifier(id.elements[1]),
                                            ) as t.VariableDeclarator & {
                                                id: t.ArrayPattern & {
                                                    elements: [
                                                        t.ArrayPattern,
                                                        t.Identifier,
                                                    ];
                                                };
                                            } | undefined;
                                    if (!argumentsArrayPattern)
                                        return;

                                    const { id: { elements: argumentsArrayPatternIdElements } } = argumentsArrayPattern;

                                    // With strict mode enabled, this causes error when generate this, 
                                    // but in the case we won't generate this, so this is safe to do
                                    bodySecondStatementArgumentCalleeNameBindingNode.params =
                                        argumentsArrayPatternIdElements;

                                    bodySecondStatementArgumentCalleeNameBindingNode.body.body.shift();

                                    bodySecondStatementArgumentCalleeNameBindingNodeCloned =
                                        t.cloneNode(bodySecondStatementArgumentCalleeNameBindingNode, true);
                                }

                                break;
                            }

                            case 2: // Normal
                                break;

                            default:
                                return;
                        }

                        const {
                            params: {
                                0: bodySecondStatementArgumentCalleeNameBindingNodeFirstParam,
                                1: bodySecondStatementArgumentCalleeNameBindingNodeSecondParam,
                            },
                        } = bodySecondStatementArgumentCalleeNameBindingNode;

                        if (!t.isArrayPattern(bodySecondStatementArgumentCalleeNameBindingNodeFirstParam))
                            return;

                        if (!t.isIdentifier(bodySecondStatementArgumentCalleeNameBindingNodeSecondParam))
                            return;

                        if (isNotEstimate) {
                            const { name: bodySecondStatementArgumentCalleeNameBindingNodeSecondParamName } =
                                bodySecondStatementArgumentCalleeNameBindingNodeSecondParam;

                            const bodyPath = path.get("body");

                            // Do this before traverse!
                            bodyPath.replaceWith(bodySecondStatementArgumentCalleeNameBindingNode.body);

                            bodyPath.traverse({
                                MemberExpression(innerPath) {
                                    const {
                                        node: innerNode,
                                        node: { object, property: innerProperty },
                                        parent: innerParent,
                                    } = innerPath;

                                    if (!t.isIdentifier(object, { name: bodySecondStatementArgumentCalleeNameBindingNodeSecondParamName }))
                                        return;

                                    let innerPropertyName: string;

                                    if (t.isStringLiteral(innerProperty))
                                        innerPropertyName = innerProperty.value;
                                    else if (t.isIdentifier(innerProperty))
                                        innerPropertyName = innerProperty.name;
                                    else
                                        return;

                                    const innerPropertyNamePseudoEntry = keyToPseudoEntry.get(innerPropertyName);
                                    if (!innerPropertyNamePseudoEntry)
                                        return;

                                    const isAssignmentTarget =
                                        t.isAssignmentExpression(innerParent) &&
                                        t.isNodesEquivalent(innerParent.left, innerNode);

                                    if (
                                        isAssignmentTarget &&
                                        innerPropertyNamePseudoEntry.setter
                                    ) {
                                        const { setter: { target: innerPropertyNamePseudoEntrySetterTarget } } =
                                            innerPropertyNamePseudoEntry;

                                        innerPath.replaceWith(innerPropertyNamePseudoEntrySetterTarget);

                                        console.log("Replaced setter access:", innerPropertyName);
                                    } else if (innerPropertyNamePseudoEntry.getter) {
                                        const { getter: innerPropertyNamePseudoEntryGetter } =
                                            innerPropertyNamePseudoEntry;

                                        switch (innerPropertyNamePseudoEntryGetter.type) {
                                            case PseudoFlattenGetterType.GET:
                                                innerPath.replaceWith(innerPropertyNamePseudoEntryGetter.expression);

                                                console.log("Replaced GET getter access:", innerPropertyName);

                                                break;

                                            case PseudoFlattenGetterType.PROXY:
                                                innerPath.replaceWith(innerPropertyNamePseudoEntryGetter.functionId);

                                                console.log("Replaced PROXY getter access:", innerPropertyName);

                                                break;
                                        }
                                    }
                                },
                            });

                            node.params =
                                bodySecondStatementArgumentCalleeNameBindingNodeFirstParam.elements.filter(t.isFunctionParameter);

                            if (
                                node.body.directives.length > 0 &&
                                node.params.length === 1 &&
                                t.isRestElement(node.params[0])
                            ) // We actually not having "use strict" if parameter is the spread
                                node.body.directives = node.body.directives.filter(
                                    ({ value: { value } }) => value !== "use strict",
                                );

                            [ // Copy special flags
                                node.async,
                                node.generator,
                            ] =
                                [
                                    bodySecondStatementArgumentCalleeNameBindingNode.async,
                                    bodySecondStatementArgumentCalleeNameBindingNode.generator,
                                ];

                            bodySecondStatementArgumentCalleeNameBindingPath.remove();

                            { // Recrawl prgoram scope
                                const { scope: programScope } = path.findParent(({ node }) => t.isProgram(node));

                                programScope.crawl();
                            }

                            context.targetCount--;
                        } else {
                            context.targetCount++;

                            if (bodySecondStatementArgumentCalleeNameBindingNodeParamsLength === 0) // Restore it back
                                bodySecondStatementArgumentCalleeNameBindingPath
                                    .replaceWith(bodySecondStatementArgumentCalleeNameBindingNodeCloned);
                        }
                    },
                };
            },
            pre: null,
            post: transformFunctionLengthSetterRemoval(context),

            first: null,
            final: null,
        };
    },
} satisfies Transform;