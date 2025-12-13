import { type Transform } from "./Transform";
import * as t from "@babel/types";
import { isFalsePredicate, transformPredicateFunctionDeclarationRemoval } from "./TransformOpaquePredicates";
import generate from "@babel/generator";

export default {
    name: "DeadCode",
    preRunWebcrack: false,
    postRunWebcrack: true,
    contextedVisitor: context => {
        return {
            on: isEstimate => {
                const isNotEstimate = !isEstimate;

                return {
                    IfStatement(path) {
                        const { node: { consequent }, scope } = path;

                        const isBlockConsequent = (
                            t.isBlockStatement(consequent) &&
                            consequent.body.length === 1 &&
                            t.isExpressionStatement(consequent.body[0])
                        );

                        const isSingleConsequent = t.isExpressionStatement(consequent);

                        if (!(isBlockConsequent || isSingleConsequent))
                            return;

                        const { expression: deadFunctionCall } =
                            (
                                isBlockConsequent
                                    ? consequent.body[0]
                                    : consequent
                            ) as t.ExpressionStatement;

                        if (!(
                            t.isCallExpression(deadFunctionCall) &&
                            deadFunctionCall.arguments.length === 0 &&
                            t.isIdentifier(deadFunctionCall.callee)
                        ))
                            return;

                        const testPath = path.get("test");

                        if (isFalsePredicate(testPath))
                            if (isNotEstimate) {
                                path.remove();

                                const deadFunctionNameBinding = scope.getBinding(deadFunctionCall.callee.name);
                                if (deadFunctionNameBinding)
                                    deadFunctionNameBinding.path.remove();

                                { // Log
                                    const { code: testCode } = generate(testPath.node);

                                    console.log(`Dead code removed, false predicate: "${testCode}"`);
                                }

                                context.targetCount--;
                            } else
                                context.targetCount++;
                    },
                };
            },
            pre: null,
            post: null, // transformPredicateFunctionDeclarationRemoval(context), // Don't do this for DeadCode

            first: null,
            final: null,
        };
    },
} satisfies Transform;