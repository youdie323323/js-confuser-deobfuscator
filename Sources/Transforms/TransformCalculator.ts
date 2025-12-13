import generate from "@babel/generator";
import type { Transform } from "./Transform";
import * as t from "@babel/types";

const isCalculatorFunctionCase = (ourCase: t.SwitchCase): ourCase is t.SwitchCase & {
    test: t.StringLiteral;
    consequent: [
        t.ReturnStatement & {
            argument: t.BinaryExpression & {
                left: t.Identifier;
                right: t.Identifier;
            };
        },
    ];
} => {
    const { test, consequent } = ourCase;

    return consequent.length === 1 &&
        t.isReturnStatement(consequent[0]) &&
        consequent[0].argument &&
        t.isBinaryExpression(consequent[0].argument) &&
        t.isIdentifier(consequent[0].argument.left) &&
        t.isIdentifier(consequent[0].argument.right) &&
        t.isStringLiteral(test);
};

export default {
    name: "Calculator",
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

                        if (!(switchCases.length !== 0 && switchCases.every(isCalculatorFunctionCase)))
                            return;

                        const idToOperator: Map<string, t.BinaryExpression["operator"]> = new Map;

                        switchCases.forEach(({
                            test: { value: id },
                            consequent: { 0: { argument: { operator } } },
                        }) => idToOperator.set(id, operator));

                        const nameBinding =
                            scope.getBinding(name);
                        if (!nameBinding)
                            return;

                        const { referencePaths: nameBindingReferencePaths } = nameBinding;

                        nameBindingReferencePaths.forEach(({ parent: innerParent, parentPath: innerParentPath }) => {
                            if (
                                t.isCallExpression(innerParent) &&
                                innerParent.arguments.length === 3 &&
                                t.isStringLiteral(innerParent.arguments[0]) &&
                                t.isExpression(innerParent.arguments[1]) &&
                                t.isExpression(innerParent.arguments[2])
                            )
                                if (isNotEstimate) {
                                    const { arguments: { 0: { value: operatorId } } } = innerParent;

                                    const operator = idToOperator.get(operatorId);

                                    const restoredBinaryExpression = t.binaryExpression(
                                        operator,
                                        innerParent.arguments[1],
                                        innerParent.arguments[2],
                                    );

                                    innerParentPath.replaceWith(restoredBinaryExpression);

                                    { // Log
                                        const { code: restoredBinaryExpressionCode } =
                                            generate(restoredBinaryExpression);

                                        console.log(`Binary restored: "${restoredBinaryExpressionCode}", operator id:`, operatorId);
                                    }

                                    context.targetCount--;
                                } else
                                    context.targetCount++;
                        });

                        if (isNotEstimate) {
                            path.remove();

                            console.log("Removed calculator function:", name);
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