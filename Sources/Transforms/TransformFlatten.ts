import { restoreVariableDeclaratorInit } from "./String/TransformStringConcealing";
import { transformFunctionLength, type Transform } from "./Transform";
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
            on(isEstimate) {
                const isNotEstimate = !isEstimate;

                return {
                    Function(path) {
                        const { node, scope } = path;

                        if (!t.isBlockStatement(node.body))
                            return;

                        const { body: { body } } = node;

                        if (2 > body.length)
                            return;

                        const bodyFirstStatementPath = path.get("body.body.0"),
                            bodyLastStatement = body[body.length - 1];

                        if (!(
                            bodyFirstStatementPath.isVariableDeclaration() &&
                            t.isReturnStatement(bodyLastStatement)
                        ))
                            return;

                        const bodyFirstStatementDeclarationsPath = bodyFirstStatementPath.get("declarations");
                        if (bodyFirstStatementDeclarationsPath.length !== 1)
                            return;

                        const { 0: bodyFirstStatementDeclarationPath } = bodyFirstStatementDeclarationsPath;

                        if (!restoreVariableDeclaratorInit(bodyFirstStatementDeclarationPath))
                            return;

                        const bodyFirstStatementDeclarationPathInit = bodyFirstStatementDeclarationPath.get("init");
                        if (!bodyFirstStatementDeclarationPathInit.isObjectExpression())
                            return;

                        const { node: { properties: bodyFirstStatementDeclarationPathInitProperties } } =
                            bodyFirstStatementDeclarationPathInit;

                        const { argument: bodyLastStatementArgument } = bodyLastStatement;

                        if (!t.isCallExpression(bodyLastStatementArgument))
                            return;

                        if (!t.isIdentifier(bodyLastStatementArgument.callee))
                            return;

                        const { callee: { name: bodyLastStatementArgumentCalleeName } }
                            = bodyLastStatementArgument;

                        const bodyLastStatementArgumentCalleeNameBinding =
                            scope.getBinding(bodyLastStatementArgumentCalleeName);
                        if (!bodyLastStatementArgumentCalleeNameBinding)
                            return;

                        const { path: bodyLastStatementArgumentCalleeNameBindingPath } = bodyLastStatementArgumentCalleeNameBinding;
                        if (!bodyLastStatementArgumentCalleeNameBindingPath.isFunctionDeclaration())
                            return;

                        const { node: bodyLastStatementArgumentCalleeNameBindingNode } =
                            bodyLastStatementArgumentCalleeNameBindingPath;

                        const keyToPseudoEntry = new Map<string, PseudoFlattenEntry>;

                        bodyFirstStatementDeclarationPathInitProperties.forEach(property => {
                            if (!t.isObjectMethod(property))
                                return;

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
                            params: bodyLastStatementArgumentCalleeNameBindingNodeParams,
                            params: { length: bodyLastStatementArgumentCalleeNameBindingNodeParamsLength },
                            body: {
                                body: bodyLastStatementArgumentCalleeNameBindingNodeBody,
                                directives: bodyLastStatementArgumentCalleeNameBindingNodeBodyDirectives,
                            },
                        } = bodyLastStatementArgumentCalleeNameBindingNode;

                        let bodySecondStatementArgumentCalleeNameBindingNodeCloned: t.FunctionDeclaration;

                        const { 0: bodyLastStatementArgumentCalleeNameBindingNodeBodyFirstStatement } =
                            bodyLastStatementArgumentCalleeNameBindingNodeBody;

                        const isUseStrictEnabled =
                            (
                                bodyLastStatementArgumentCalleeNameBindingNodeParamsLength === 0 ||
                                (
                                    bodyLastStatementArgumentCalleeNameBindingNodeParamsLength > 0 &&
                                    !t.isArrayPattern(bodyLastStatementArgumentCalleeNameBindingNodeParams[0])
                                )
                            ) &&
                            bodyLastStatementArgumentCalleeNameBindingNodeBodyDirectives.length > 0 &&
                            t.isVariableDeclaration(bodyLastStatementArgumentCalleeNameBindingNodeBodyFirstStatement);

                        if (isUseStrictEnabled) { // Use strict enabled, directives are not removed
                            const argumentsArrayPattern =
                                bodyLastStatementArgumentCalleeNameBindingNodeBodyFirstStatement.declarations
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
                            bodyLastStatementArgumentCalleeNameBindingNode.params =
                                argumentsArrayPatternIdElements;

                            bodyLastStatementArgumentCalleeNameBindingNode.body.body.shift();

                            bodySecondStatementArgumentCalleeNameBindingNodeCloned =
                                t.cloneNode(bodyLastStatementArgumentCalleeNameBindingNode, true);
                        }

                        const {
                            params: {
                                0: bodyLastStatementArgumentCalleeNameBindingNodeFirstParam,
                                1: bodyLastStatementArgumentCalleeNameBindingNodeSecondParam,
                            },
                        } = bodyLastStatementArgumentCalleeNameBindingNode;

                        if (!t.isArrayPattern(bodyLastStatementArgumentCalleeNameBindingNodeFirstParam))
                            return;

                        if (!t.isIdentifier(bodyLastStatementArgumentCalleeNameBindingNodeSecondParam))
                            return;

                        if (isNotEstimate) {
                            const { name: bodySecondStatementArgumentCalleeNameBindingNodeSecondParamName } =
                                bodyLastStatementArgumentCalleeNameBindingNodeSecondParam;

                            const bodyPath = path.get("body");

                            // Do this before traverse!
                            bodyPath.replaceWith(bodyLastStatementArgumentCalleeNameBindingNode.body);

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
                                bodyLastStatementArgumentCalleeNameBindingNodeFirstParam.elements.filter(t.isFunctionParameter);

                            const { params, body } = node;

                            if (
                                body.directives.length > 0 &&
                                params.length === 1 &&
                                t.isRestElement(params[0])
                            ) // We actually not having "use strict" if parameter is the spread
                                body.directives =
                                    body.directives.filter(
                                        ({ value: { value } }) =>
                                            value !== "use strict",
                                    );

                            [ // Copy special flags
                                node.async,
                                node.generator,
                            ] =
                                [
                                    bodyLastStatementArgumentCalleeNameBindingNode.async,
                                    bodyLastStatementArgumentCalleeNameBindingNode.generator,
                                ];

                            bodyLastStatementArgumentCalleeNameBindingPath.remove();

                            console.log("Restored flattened function");

                            context.targetCount--;
                        } else {
                            context.targetCount++;

                            if (bodySecondStatementArgumentCalleeNameBindingNodeCloned) // Restore it back
                                bodyLastStatementArgumentCalleeNameBindingPath
                                    .replaceWith(bodySecondStatementArgumentCalleeNameBindingNodeCloned);
                        }
                    },
                };
            },
            pre: null,
            post: transformFunctionLength(context, false),

            first: null,
            final: null,
        };
    },
} satisfies Transform;