import type { Transform } from "../Transform";
import * as t from "@babel/types";

export default {
    name: "StringConcealing",
    preRunWebcrack: false,
    postRunWebcrack: true, // Simplify StringSplitting
    contextedVisitor: context => ({
        on: isEstimate => {
            const isNotEstimate = !isEstimate;

            const decodedCache: Map<number, string> = new Map;

            return {
                FunctionDeclaration(path) {
                    const {
                        node: {
                            id: { name },
                            params,
                            body: { body },
                        },
                        scope,
                    } = path;

                    if (params.length !== 1 || body.length !== 2)
                        return;

                    const { 0: firstParam } = params;
                    if (!t.isIdentifier(firstParam))
                        return;

                    const { name: indexParamName } = firstParam;

                    const {
                        0: firstBodyStatement,
                        1: secondBodyStatement,
                    } = body;

                    if (!(
                        t.isIfStatement(firstBodyStatement) &&
                        t.isReturnStatement(secondBodyStatement) &&
                        secondBodyStatement.argument
                    ))
                        return;

                    if (!(
                        !firstBodyStatement.alternate &&
                        t.isBinaryExpression(firstBodyStatement.test, { operator: "===" }) &&
                        t.isUnaryExpression(firstBodyStatement.test.left, { operator: "typeof", prefix: true }) &&
                        t.isMemberExpression(firstBodyStatement.test.left.argument, { computed: true }) &&
                        t.isIdentifier(firstBodyStatement.test.left.argument.object) &&
                        t.isIdentifier(firstBodyStatement.test.left.argument.property, { name: indexParamName }) &&
                        t.isStringLiteral(firstBodyStatement.test.right, { value: "undefined" })
                    ))
                        return;

                    const { test: { left: { argument: { object: { name: cacheObjectName } } } } } = firstBodyStatement;

                    const { argument: secondBodyStatementArgument } = secondBodyStatement;

                    if (!(
                        t.isMemberExpression(secondBodyStatementArgument, { computed: true }) &&
                        t.isIdentifier(secondBodyStatementArgument.object, { name: cacheObjectName }) &&
                        t.isIdentifier(secondBodyStatementArgument.property, { name: indexParamName })
                    ))
                        return;

                    const { consequent: firstBodyStatementConsequent } = firstBodyStatement;

                    if (!t.isBlockStatement(firstBodyStatementConsequent)) // TODO: handle if firstBodyStatementConsequent is expression
                        return;

                    const { body: firstBodyStatementConsequentBody } = firstBodyStatementConsequent;

                    if (firstBodyStatementConsequentBody.length !== 1)
                        return;

                    const { 0: firstBodyStatementConsequentBodyStatement } = firstBodyStatementConsequentBody;

                    if (!(
                        t.isReturnStatement(firstBodyStatementConsequentBodyStatement) &&
                        firstBodyStatementConsequentBodyStatement.argument
                    ))
                        return;

                    const { argument: firstBodyStatementConsequentBodyStatementArgument } = firstBodyStatementConsequentBodyStatement;

                    if (!(
                        t.isAssignmentExpression(firstBodyStatementConsequentBodyStatementArgument) &&
                        t.isMemberExpression(firstBodyStatementConsequentBodyStatementArgument.left, { computed: true }) &&
                        t.isIdentifier(firstBodyStatementConsequentBodyStatementArgument.left.object, { name: cacheObjectName }) &&
                        t.isIdentifier(firstBodyStatementConsequentBodyStatementArgument.left.property, { name: indexParamName }) &&
                        t.isCallExpression(firstBodyStatementConsequentBodyStatementArgument.right) &&
                        t.isIdentifier(firstBodyStatementConsequentBodyStatementArgument.right.callee) &&
                        firstBodyStatementConsequentBodyStatementArgument.right.arguments.length === 1 &&
                        t.isMemberExpression(firstBodyStatementConsequentBodyStatementArgument.right.arguments[0], { computed: true }) &&
                        t.isIdentifier(firstBodyStatementConsequentBodyStatementArgument.right.arguments[0].object) &&
                        t.isIdentifier(firstBodyStatementConsequentBodyStatementArgument.right.arguments[0].property, { name: indexParamName })
                    ))
                        return;

                    const {
                        right: {
                            callee: {
                                name: decodeFunctionName,
                            },
                            arguments: {
                                0: {
                                    object: {
                                        name: stringArrayName,
                                    },
                                },
                            },
                        },
                    } = firstBodyStatementConsequentBodyStatementArgument;

                    const stringArrayNameBinding = scope.getBinding(stringArrayName);
                    if (!stringArrayNameBinding)
                        return;

                    const { path: stringArrayNameBindingPath } = stringArrayNameBinding,
                        { node: stringArrayNameBindingNode } = stringArrayNameBindingPath;

                    if (!(
                        t.isVariableDeclarator(stringArrayNameBindingNode) &&
                        stringArrayNameBindingNode.init &&
                        t.isArrayExpression(stringArrayNameBindingNode.init) &&
                        stringArrayNameBindingNode.init.elements.length > 0 &&
                        stringArrayNameBindingNode.init.elements.every(t.isStringLiteral)
                    ))
                        return;

                    const stringArray = stringArrayNameBindingNode.init.elements.map(element => element.value);

                    const decodeFunctionNameBinding = scope.getBinding(decodeFunctionName);
                    if (!decodeFunctionNameBinding)
                        return;

                    const { path: decodeFunctionNameBindingPath } = decodeFunctionNameBinding,
                        { node: decodeFunctionNameBindingNode } = decodeFunctionNameBindingPath;

                    if (!(
                        t.isFunctionDeclaration(decodeFunctionNameBindingNode) &&
                        decodeFunctionNameBindingNode.params.length === 1 &&
                        t.isIdentifier(decodeFunctionNameBindingNode.params[0]) &&
                        decodeFunctionNameBindingNode.body.body.length > 0
                    ))
                        return;

                    // We assume decodeFunctionNameBindingNode is the decode function without analyzing body

                    const { body: { body: decodeFunctionNameBindingNodeBody } } = decodeFunctionNameBindingNode;

                    const { 0: decodeFunctionNameBindingNodeBodyFirstStatement } = decodeFunctionNameBindingNodeBody;
                    if (!(
                        t.isVariableDeclaration(decodeFunctionNameBindingNodeBodyFirstStatement) &&
                        decodeFunctionNameBindingNodeBodyFirstStatement.declarations.length > 0 &&
                        t.isIdentifier(decodeFunctionNameBindingNodeBodyFirstStatement.declarations[0].id) &&
                        decodeFunctionNameBindingNodeBodyFirstStatement.declarations[0].init &&
                        t.isStringLiteral(decodeFunctionNameBindingNodeBodyFirstStatement.declarations[0].init)
                    ))
                        return;

                    const { declarations: { 0: { init: { value: tableValue } } } } =
                        decodeFunctionNameBindingNodeBodyFirstStatement;

                    if (isNotEstimate)
                        console.log(`Found table: "${tableValue}"`);

                    const innerDecode = (chars: string) => {
                        const decodedBuffer: Array<number> = new Array;

                        let b = 0,
                            n = 0,
                            v = -1;

                        const { length: charsLength } = chars;

                        for (let i = 0; i < charsLength; i++) {
                            const p = tableValue.indexOf(chars[i]);
                            if (p === -1)
                                continue;

                            if (v < 0)
                                v = p;
                            else {
                                v += 91 * p;

                                b |= v << n;
                                n +=
                                    (v & 8191) > 88
                                        ? 13
                                        : 14;

                                do {
                                    decodedBuffer.push(b & 0xff);

                                    b >>= 8;
                                    n -= 8;
                                } while (n > 7);

                                v = -1;
                            }
                        }

                        if (v > -1)
                            decodedBuffer.push((b | (v << n)) & 0xff);

                        return Buffer.from(decodedBuffer).toString("utf-8");
                    };

                    const decode = (index: number) => {
                        const indexCachedDecoded = decodedCache.get(index);
                        if (indexCachedDecoded) {
                            console.log(`Index ${index} cached: "${indexCachedDecoded}"`);

                            return indexCachedDecoded;
                        }

                        const decoded = innerDecode(stringArray[index]);

                        console.log(`Index ${index} decoded: "${decoded}"`);

                        decodedCache.set(index, decoded);

                        return decoded;
                    };

                    const nameBinding = scope.getBinding(name);
                    if (!nameBinding)
                        return;

                    const { referencePaths: nameBindingReferencePaths } = nameBinding;

                    nameBindingReferencePaths.forEach(({ parentPath: innerParentPath, parentPath: { node: innerParentNode } }) => {
                        if (
                            t.isCallExpression(innerParentNode) &&
                            innerParentNode.arguments.length === 1 &&
                            t.isNumericLiteral(innerParentNode.arguments[0])
                        )
                            if (isNotEstimate) {
                                innerParentPath.replaceWith(t.valueToNode(decode(innerParentNode.arguments[0].value)));

                                context.targetCount--;
                            } else
                                context.targetCount++;
                    });

                    if (isNotEstimate) {
                        decodeFunctionNameBindingPath.remove();

                        // No!
                        // stringArrayNameBindingPath.remove();

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