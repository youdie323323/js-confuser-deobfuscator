import { type Transform } from "./Transform";
import * as t from "@babel/types";
import { containerContainsExpression } from "./TransformVariableMasking";
import type { NodePath } from "@babel/traverse";

type FunctionExpressionAssignmentExpression = t.AssignmentExpression & {
    left: t.Identifier;
    right: t.FunctionExpression;
};

export default {
    name: "MovedDeclarations",
    preRunWebcrack: false,
    postRunWebcrack: false,
    contextedVisitor: context => {
        return {
            on: isEstimate => {
                const isNotEstimate = !isEstimate;

                return {
                    Function(path) {
                        const { node, node: { body }, scope } = path;

                        if (!t.isBlockStatement(body))
                            return;

                        const { body: bodyBody } = body;

                        bodyBody.forEach((statement, index) => {
                            if (
                                t.isIfStatement(statement) &&
                                t.isUnaryExpression(statement.test, { operator: "!" }) &&
                                t.isIdentifier(statement.test.argument)
                            ) {
                                const {
                                    test: { argument: { name: statementTestArgumentName } },
                                    consequent,
                                } = statement;

                                let functionExpressionAssignmentExpression: FunctionExpressionAssignmentExpression;

                                if (t.isBlockStatement(consequent)) {
                                    const { body: { 0: consequentFirstStatement } } = consequent;

                                    if (
                                        consequentFirstStatement &&
                                        t.isExpressionStatement(consequentFirstStatement)
                                    ) {
                                        const { expression: consequentFirstStatementExpression } = consequentFirstStatement;

                                        if (
                                            t.isAssignmentExpression(consequentFirstStatementExpression, { operator: "=" }) &&
                                            t.isIdentifier(consequentFirstStatementExpression.left, { name: statementTestArgumentName }) &&
                                            t.isFunctionExpression(consequentFirstStatementExpression.right)
                                        )
                                            functionExpressionAssignmentExpression =
                                                consequentFirstStatementExpression as FunctionExpressionAssignmentExpression;
                                    }
                                } else
                                    return;

                                if (!functionExpressionAssignmentExpression)
                                    return;

                                if (isNotEstimate) {
                                    const { right: functionExpressionAssignmentExpressionRight } =
                                        functionExpressionAssignmentExpression;

                                    bodyBody[index] = t.functionDeclaration(
                                        t.identifier(statementTestArgumentName),
                                        functionExpressionAssignmentExpressionRight.params,
                                        functionExpressionAssignmentExpressionRight.body,
                                        functionExpressionAssignmentExpressionRight.generator,
                                        functionExpressionAssignmentExpressionRight.async,
                                    );

                                    // Remove statementTestArgumentName from parameter
                                    node.params =
                                        node.params.filter(
                                            param =>
                                                !t.isIdentifier(param, { name: statementTestArgumentName }),
                                        );

                                    console.log("Moved function declaration:", statementTestArgumentName);

                                    context.targetCount--;
                                } else
                                    context.targetCount++;
                            }
                        });

                        const { params } = node;

                        params.forEach(param => {
                            /*
                                The default paramter is irreversible

                                ```js
                                function greet(name) {
                                  var c = 1;
                                  var output = 'Hello ' + name + c + '!';
                                  console.log(output);
                                  function breet(name) {
                                    var output = 'Hello ' + name + '!';
                                    console.log(output);
                                  }
                                  breet(output);
                                }

                                greet('Internet User');
                                ```

                                to

                                ```js
                                function greet(name, c = 1, output, breet) {
                                  if (!breet) {
                                    breet = function (name, output) {
                                      output = "Hello " + name + "!";
                                      console.log(output);
                                    };
                                  }
                                  output = "Hello " + name + c + "!";
                                  console.log(output);
                                  breet(output);
                                }
                                greet("Internet User");
                                ```

                                If we have default parameter after deleted parameters, we can simplify it, but it's not true
                            */

                            if (!t.isIdentifier(param))
                                return;

                            const { name: paramName } = param;

                            const paramNameBinding = scope.getBinding(paramName);
                            if (!paramNameBinding)
                                return;

                            for (const constantViolation of paramNameBinding.constantViolations) {
                                if (!constantViolation.isAssignmentExpression())
                                    continue;

                                const {
                                    node: { operator: innerOperator },
                                    parentPath: innerParentPath,
                                } = constantViolation;

                                if (innerOperator !== "=")
                                    continue;

                                if (!innerParentPath.isExpressionStatement())
                                    continue;

                                const innerRight = constantViolation.get("right");

                                if (!containerContainsExpression(innerRight, param))
                                    if (isNotEstimate) {
                                        innerParentPath.replaceWith(t.variableDeclaration(
                                            "let",
                                            [
                                                t.variableDeclarator(
                                                    param,
                                                    innerRight.node,
                                                ),
                                            ],
                                        ));

                                        // Remove paramName from parameter
                                        node.params =
                                            node.params.filter(
                                                innerParam =>
                                                    !t.isIdentifier(innerParam, { name: paramName }),
                                            );

                                        context.targetCount--;

                                        console.log("Moved variable:", paramName);

                                        break;
                                    } else
                                        context.targetCount++;
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