import { type Transform } from "./Transform";
import * as t from "@babel/types";
import { containerContainsExpression, isForStatementInitNodePath } from "./TransformVariableMasking";
import { isOperatorJsConfuserSlowAssignmentOperator } from "./String/TransformStringConcealing";

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
            on(isEstimate) {
                const isNotEstimate = !isEstimate;

                return {
                    Function(path) {
                        const { node, scope } = path;

                        const bodyPath = path.get("body");

                        if (!bodyPath.isBlockStatement())
                            return;

                        const bodyBodyPath = bodyPath.get("body");

                        bodyBodyPath.forEach(statementPath => {
                            const { node: statement } = statementPath;

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

                                    statementPath.replaceWith(t.functionDeclaration(
                                        t.identifier(statementTestArgumentName),
                                        functionExpressionAssignmentExpressionRight.params,
                                        functionExpressionAssignmentExpressionRight.body,
                                        functionExpressionAssignmentExpressionRight.generator,
                                        functionExpressionAssignmentExpressionRight.async,
                                    ));

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

                            if (paramNameBinding.kind !== "param") {
                                if (isNotEstimate)
                                    console.log(`Variable ${paramName} already declared in body, keeping as assignment`);

                                return;
                            }

                            const {
                                referencePaths: paramNameBindingReferencePaths,
                                constantViolations: paramNameBindingConstantViolations,
                            } = paramNameBinding;

                            for (const constantViolation of paramNameBindingConstantViolations) {
                                // If parameter is used like "for (param X some) { ... }", constant violation is ForXStatement
                                if (constantViolation.isForXStatement()) {
                                    const constantViolationLeftPath = constantViolation.get("left");

                                    const { node: { start: forXStatementStart } } = constantViolation;

                                    const isUsedBeforeForXStatement =
                                        forXStatementStart &&
                                        paramNameBindingReferencePaths.some(
                                            referencePath => {
                                                const { node: { start: referenceStart } } = referencePath;

                                                // Exclude references inside the ForXStatement itself
                                                if (referencePath.findParent(path => path === constantViolation))
                                                    return false;

                                                return referenceStart &&
                                                    referenceStart < forXStatementStart;
                                            },
                                        );

                                    if (isUsedBeforeForXStatement) {
                                        if (isNotEstimate)
                                            console.log(`Variable ${paramName} is used before for-x statement`);

                                        continue;
                                    }

                                    if (isNotEstimate) {
                                        constantViolationLeftPath.replaceWith(t.variableDeclaration(
                                            "var",
                                            [
                                                t.variableDeclarator(
                                                    t.identifier(paramName),
                                                ),
                                            ],
                                        ));

                                        node.params =
                                            node.params.filter(
                                                innerParam =>
                                                    !t.isIdentifier(innerParam, { name: paramName }),
                                            );

                                        console.log("Moved variable (for-x):", paramName);

                                        context.targetCount--;

                                        break;
                                    } else
                                        context.targetCount++;

                                    continue;
                                }

                                if (!constantViolation.isAssignmentExpression())
                                    continue;

                                const {
                                    node: {
                                        start: constantViolationStart,

                                        operator: constantViolationOperator,
                                    },
                                    parentPath: innerParentPath,
                                } = constantViolation;

                                if (!isOperatorJsConfuserSlowAssignmentOperator(constantViolationOperator))
                                    continue;

                                const isInnerParentPathExpressionStatement = innerParentPath.isExpressionStatement(),
                                    isConstantViolationForStatementInitNodePath = isForStatementInitNodePath(constantViolation);

                                if (!(
                                    isInnerParentPathExpressionStatement ||
                                    isConstantViolationForStatementInitNodePath
                                ))
                                    continue;

                                const innerRight = constantViolation.get("right");

                                const isUsedBeforeAssignment =
                                    constantViolationStart &&
                                    paramNameBindingReferencePaths.some(
                                        ({ node: { start: innerNodeStart } }) =>
                                            innerNodeStart &&
                                            innerNodeStart < constantViolationStart,
                                    );

                                if (isUsedBeforeAssignment) {
                                    if (isNotEstimate)
                                        console.log(`Variable ${paramName} is used before assignment`);

                                    continue;
                                }

                                if (!containerContainsExpression(innerRight, param))
                                    if (isNotEstimate) {
                                        const newInnerParent = t.variableDeclaration(
                                            "var",
                                            [
                                                t.variableDeclarator(
                                                    param,
                                                    innerRight.node,
                                                ),
                                            ],
                                        );

                                        if (isInnerParentPathExpressionStatement)
                                            innerParentPath.replaceWith(newInnerParent);
                                        else if (isConstantViolationForStatementInitNodePath)
                                            constantViolation.replaceWith(newInnerParent);
                                        else
                                            continue;

                                        node.params =
                                            node.params.filter(
                                                innerParam =>
                                                    !t.isIdentifier(innerParam, { name: paramName }),
                                            );

                                        console.log("Moved variable:", paramName);

                                        context.targetCount--;

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