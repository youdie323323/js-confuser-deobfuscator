import { type Transform } from "./Transform";
import * as t from "@babel/types";
import { isFalsePredicate } from "./TransformOpaquePredicates";
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
                        const { node, node: { consequent }, scope } = path;

                        const testPath = path.get("test");

                        if (isFalsePredicate(testPath))
                            if (isNotEstimate) {
                                removeDeadFunction: {
                                    const isBlockConsequent = (
                                        t.isBlockStatement(consequent) &&
                                        t.isExpressionStatement(consequent.body[0])
                                    );

                                    const isSingleConsequent = t.isExpressionStatement(consequent);

                                    if (!(isBlockConsequent || isSingleConsequent))
                                        break removeDeadFunction;

                                    const { expression: deadFunctionCall } =
                                        (
                                            isBlockConsequent
                                                ? consequent.body[0]
                                                : consequent
                                        ) as t.ExpressionStatement;

                                    if (!(
                                        t.isCallExpression(deadFunctionCall) &&
                                        deadFunctionCall.arguments.length === 0 &&
                                        t.isIdentifier(deadFunctionCall.callee) // TODO: support "(1, deadFunction)()"
                                    ))
                                        break removeDeadFunction;

                                    const deadFunctionNameBinding = scope.getBinding(deadFunctionCall.callee.name);
                                    if (deadFunctionNameBinding)
                                        deadFunctionNameBinding.path.remove();
                                }

                                if (node.alternate)
                                    t.isBlockStatement(node.alternate)
                                        ? path.replaceWithMultiple(node.alternate.body)
                                        : path.replaceWith(node.alternate);
                                else
                                    path.remove();

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
            post: null,

            first: null,
            final: null,
        };
    },
} satisfies Transform;