import type { Transform } from "./Transform";
import * as t from "@babel/types";

export function isGetGlobalFunctionDeclaration({ params, body: { body } }: t.FunctionDeclaration): boolean {
    if (params.length !== 0)
        return false;

    if (body.length !== 6)
        return false;

    const { 0: firstStatement } = body;

    if (!(
        t.isVariableDeclaration(firstStatement) &&
        firstStatement.declarations.length === 1 &&
        firstStatement.declarations[0].init &&
        t.isArrayExpression(firstStatement.declarations[0].init)
    ))
        return false;

    const lastStatement = body[body.length - 1];

    if (!(
        t.isReturnStatement(lastStatement) &&
        lastStatement.argument &&
        t.isLogicalExpression(lastStatement.argument) &&
        t.isIdentifier(lastStatement.argument.left) &&
        t.isThisExpression(lastStatement.argument.right)
    ))
        return false;

    return true;
}

const isGlobalConcealingGetFunctionCase = (ourCase: t.SwitchCase): ourCase is t.SwitchCase & {
    test: t.StringLiteral;
    consequent: [
        t.ReturnStatement & {
            argument: t.MemberExpression & {
                object: t.Identifier;
                property: t.Identifier | t.StringLiteral;
            };
        },
    ];
} => {
    const { test, consequent } = ourCase;

    return consequent.length === 1 &&
        t.isReturnStatement(consequent[0]) &&
        consequent[0].argument &&
        t.isMemberExpression(consequent[0].argument) &&
        t.isIdentifier(consequent[0].argument.object) &&
        (t.isIdentifier(consequent[0].argument.property) || t.isStringLiteral(consequent[0].argument.property)) &&
        t.isStringLiteral(test);
};

export default {
    name: "GlobalConcealing",
    preRunWebcrack: false,
    postRunWebcrack: false,
    contextedVisitor: context => {
        return {
            on: isEstimate => {
                const isNotEstimate = !isEstimate;

                return {
                    FunctionDeclaration(path) {
                        const {
                            node: {
                                body: { body },
                                id: { name },
                            },
                            scope,
                        } = path;

                        if (body.length !== 1)
                            return;

                        const { 0: switchStatement } = body;

                        if (!t.isSwitchStatement(switchStatement))
                            return;

                        const { discriminant: switchDiscriminant, cases: switchCases } = switchStatement;

                        if (!t.isIdentifier(switchDiscriminant))
                            return;

                        if (!(switchCases.length !== 0 && switchCases.every(isGlobalConcealingGetFunctionCase)))
                            return;

                        const stringToGlobalIdentifier: Map<string, t.Identifier> = new Map;

                        switchCases.forEach(({ test: { value: string }, consequent }) => {
                            const { 0: { argument: { property: returnArgumentProperty } } } = consequent;

                            stringToGlobalIdentifier.set(
                                string,
                                t.isStringLiteral(returnArgumentProperty)
                                    ? t.identifier(returnArgumentProperty.value)
                                    : returnArgumentProperty,
                            );
                        });

                        if (isNotEstimate) { // Log string to global
                            const stringToGlobal: Map<string, string> = new Map;

                            stringToGlobalIdentifier.forEach(
                                (globalIdentifier, string) =>
                                    stringToGlobal.set(string, globalIdentifier.name),
                            );

                            console.log("String to global:", stringToGlobal);
                        }

                        const { 0: minimalSwitchCase } = switchCases;

                        if (!isGlobalConcealingGetFunctionCase(minimalSwitchCase))
                            return;

                        const { consequent: minimalSwitchCaseConsequent } = minimalSwitchCase;

                        const minimalSwitchCaseConsequentArgumentObjectNameBinding =
                            scope.getBinding(minimalSwitchCaseConsequent[0].argument.object.name);
                        if (!minimalSwitchCaseConsequentArgumentObjectNameBinding)
                            return;

                        const {
                            path: minimalSwitchCaseConsequentArgumentObjectNamePath,
                            path: { node: minimalSwitchCaseConsequentArgumentObjectNameNode },
                        } = minimalSwitchCaseConsequentArgumentObjectNameBinding;

                        if (!(
                            t.isVariableDeclarator(minimalSwitchCaseConsequentArgumentObjectNameNode) &&
                            t.isIdentifier(minimalSwitchCaseConsequentArgumentObjectNameNode.id) &&
                            minimalSwitchCaseConsequentArgumentObjectNameNode.init &&
                            t.isCallExpression(minimalSwitchCaseConsequentArgumentObjectNameNode.init) &&
                            minimalSwitchCaseConsequentArgumentObjectNameNode.init.arguments.length === 0 &&
                            t.isIdentifier(minimalSwitchCaseConsequentArgumentObjectNameNode.init.callee)
                        ))
                            return;

                        const { init: { callee: getGlobalFunctionIdentifier } } =
                            minimalSwitchCaseConsequentArgumentObjectNameNode;

                        const getGlobalFunctionBinding =
                            scope.getBinding(getGlobalFunctionIdentifier.name);
                        if (!getGlobalFunctionBinding)
                            return;

                        const {
                            path: getGlobalFunctionPath,
                            path: { node: getGlobalFunctionNode },
                        } = getGlobalFunctionBinding;

                        if (!t.isFunctionDeclaration(getGlobalFunctionNode))
                            return;

                        if (!isGetGlobalFunctionDeclaration(getGlobalFunctionNode))
                            return;

                        const nameBinding =
                            scope.getBinding(name);
                        if (!nameBinding)
                            return;

                        const { referencePaths: nameBindingReferencePaths } = nameBinding;

                        nameBindingReferencePaths.forEach(innerPath => {
                            const { parent: innerParent, parentPath: innerParentPath } = innerPath;

                            if (
                                t.isCallExpression(innerParent) &&
                                innerParent.arguments.length === 1 &&
                                t.isStringLiteral(innerParent.arguments[0])
                            )
                                if (isNotEstimate) {
                                    const { value: string } = innerParent.arguments[0];

                                    const stringGlobalIdentifier = stringToGlobalIdentifier.get(string);

                                    innerParentPath.replaceWith(stringGlobalIdentifier);

                                    { // Log
                                        console.log(`Replaced string access ${name}("${string}") => "${stringGlobalIdentifier.name}"`);
                                    }

                                    context.targetCount--;
                                } else
                                    context.targetCount++;
                        });

                        if (isNotEstimate) {
                            minimalSwitchCaseConsequentArgumentObjectNamePath.remove();
                            getGlobalFunctionPath.remove();

                            path.remove();
                        }
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