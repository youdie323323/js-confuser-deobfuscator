import type { Transform } from "../Transform";
import * as t from "@babel/types";
import { decompressFromUTF16 } from "lz-string";

export default {
    name: "StringCompression",
    preRunWebcrack: false,
    postRunWebcrack: true,
    contextedVisitor: context => ({
        on: isEstimate => {
            const isNotEstimate = !isEstimate;

            return {
                // TODO: remove library code and string get function too

                CallExpression(path) {
                    const { node } = path;
                    const { callee } = node;

                    if (!t.isFunctionExpression(callee))
                        return;

                    const { body: { body } } = callee;

                    if (body.length !== 4)
                        return;

                    const {
                        0: firstStatement,
                        1: secondStatement,
                        2: thirdStatement,
                        3: fourthStatement,
                    } = body;

                    // First statement

                    if (!(t.isVariableDeclaration(firstStatement) && firstStatement.declarations.length === 1))
                        return;

                    const { 0: firstStatementDeclaration } = firstStatement.declarations;
                    if (!(firstStatementDeclaration.init && t.isStringLiteral(firstStatementDeclaration.init) && t.isIdentifier(firstStatementDeclaration.id)))
                        return;

                    const {
                        id: { name: firstStatementDeclarationName },
                        init: { value: encodedDelimitedStringValue },
                    } = firstStatementDeclaration;

                    // Second statement

                    if (!(t.isVariableDeclaration(secondStatement) && secondStatement.declarations.length === 1))
                        return;

                    const { declarations: { 0: secondStatementDeclaration } } = secondStatement;

                    if (!t.isIdentifier(secondStatementDeclaration.id))
                        return;

                    if (!t.isCallExpression(secondStatementDeclaration.init))
                        return;

                    const { init: { callee: secondStatementDeclarationCallee, arguments: secondArguments } } = secondStatementDeclaration;

                    if (!t.isMemberExpression(secondStatementDeclarationCallee))
                        return;

                    if (!t.isIdentifier(secondStatementDeclarationCallee.property, { name: "decompressFromUTF16" }))
                        return;

                    if (!t.isIdentifier(secondArguments[0], { name: firstStatementDeclarationName }))
                        return;

                    // Third statement

                    const { id: { name: secondStatementDeclarationName } } = secondStatementDeclaration;

                    if (!(t.isVariableDeclaration(thirdStatement) && thirdStatement.declarations.length === 1))
                        return;

                    const { declarations: { 0: thirdStatementDeclaration } } = thirdStatement;

                    if (!t.isIdentifier(thirdStatementDeclaration.id))
                        return;

                    if (!t.isCallExpression(thirdStatementDeclaration.init))
                        return;

                    const { init: { callee: thirdStatementDeclarationCallee, arguments: thirdArguments } } = thirdStatementDeclaration;

                    if (!t.isMemberExpression(thirdStatementDeclarationCallee))
                        return;

                    if (!t.isIdentifier(thirdStatementDeclarationCallee.object, { name: secondStatementDeclarationName }))
                        return;

                    if (!t.isIdentifier(thirdStatementDeclarationCallee.property, { name: "split" }))
                        return;

                    const { 0: stringDelimiter } = thirdArguments;
                    if (!t.isStringLiteral(stringDelimiter))
                        return;

                    const { value: stringDelimiterValue } = stringDelimiter;

                    // Fourth statement

                    const { id: { name: thirdStatementDeclarationName } } = thirdStatementDeclaration;

                    const isFourthStatementExpression = t.isExpressionStatement(fourthStatement);
                    const isFourthStatementReturn = t.isReturnStatement(fourthStatement);

                    if (!(isFourthStatementExpression || (isFourthStatementReturn && fourthStatement.argument)))
                        return;

                    const fourthStatementExpressionOrReturn =
                        fourthStatement[isFourthStatementExpression ? "expression" : "argument"];

                    if (!t.isAssignmentExpression(fourthStatementExpressionOrReturn))
                        return;

                    const { left: fourthStatementExpressionLeft, right: fourthStatementExpressionRight } = fourthStatementExpressionOrReturn;
                    if (!t.isFunctionExpression(fourthStatementExpressionRight))
                        return;

                    if (!t.isIdentifier(fourthStatementExpressionLeft))
                        return;

                    const { body: { body: fourthStatementExpressionRightBodyBody } } = fourthStatementExpressionRight;
                    if (!(fourthStatementExpressionRightBodyBody.length === 1 && t.isReturnStatement(fourthStatementExpressionRightBodyBody[0])))
                        return;

                    const { argument: fourthStatementExpressionRightBodyBodyReturnArgument } = fourthStatementExpressionRightBodyBody[0];

                    if (!t.isMemberExpression(fourthStatementExpressionRightBodyBodyReturnArgument))
                        return;

                    if (!t.isIdentifier(fourthStatementExpressionRightBodyBodyReturnArgument.object, { name: thirdStatementDeclarationName }))
                        return;

                    const delimitedStringValue = decompressFromUTF16(encodedDelimitedStringValue);

                    const splittedStringValue = delimitedStringValue.split(stringDelimiterValue);

                    const { name: fourthStatementExpressionLeftName } = fourthStatementExpressionLeft;

                    const { parentPath: { scope: parentScope } } = path;

                    const parentScopeFourthStatementExpressionLeftNameBinding =
                        parentScope.getBinding(fourthStatementExpressionLeftName);

                    const {
                        path: parentScopeFourthStatementExpressionLeftNameBindingPath,
                        referencePaths: parentScopeFourthStatementExpressionLeftNameBindingReferencePaths,
                    } = parentScopeFourthStatementExpressionLeftNameBinding;

                    parentScopeFourthStatementExpressionLeftNameBindingReferencePaths
                        .forEach(path => {
                            const { parentPath } = path;

                            const { node: parentNode } = parentPath;

                            if (
                                t.isCallExpression(parentNode) &&
                                parentNode.arguments.length === 1 &&
                                t.isNumericLiteral(parentNode.arguments[0])
                            )
                                if (isNotEstimate) {
                                    const { value: parentNodeArgumentValue } = parentNode.arguments[0];

                                    const stringValue = splittedStringValue[parentNodeArgumentValue];

                                    parentPath.replaceWith(t.valueToNode(stringValue));

                                    { // Log
                                        console.log(`Replaced ${fourthStatementExpressionLeftName}(${parentNodeArgumentValue}) => "${stringValue}"`);
                                    }

                                    context.targetCount--;
                                } else
                                    context.targetCount++;
                        });

                    if (isNotEstimate) {
                        parentScopeFourthStatementExpressionLeftNameBindingPath.remove();

                        path.remove();
                    }
                },
            };
        },
        pre: null,
        post: null,

        first: null,
        final: null,
    }),
} satisfies Transform;