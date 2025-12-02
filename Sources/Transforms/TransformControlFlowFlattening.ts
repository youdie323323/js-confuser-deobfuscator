import type { Transform } from "./Transform";
import * as t from "@babel/types";
import type { NodePath } from "@babel/traverse";
import traverse from "@babel/traverse";
import generate from "@babel/generator";

type LiteralConstants = Record<string, number>;

type Flow = t.SwitchCase;

type FlowWithContext = string | null;

type FlowPositions = Record<string, number>;

type FlowTransition =
    | {
        type: "linear";

        literalConstants: LiteralConstants;

        flowPositions: FlowPositions;

        flowWithContextChange: FlowWithContext;

        flowBlockBody: Array<t.Statement>;
    }
    | {
        type: "branch";
        test: t.Expression;

        trueLiteralConstants: LiteralConstants;
        falseLiteralConstants: LiteralConstants;

        trueFlowPositions: FlowPositions;
        falseFlowPositions: FlowPositions;

        trueFlowWithContextChange: FlowWithContext;
        falseFlowWithContextChange: FlowWithContext;

        remainBlockBody: Array<t.Statement>;
    }
    | {
        type: "end";

        flowBlockBody: Array<t.Statement>;
    };

type FlowState =
    { literalConstants: LiteralConstants; flowPositions: FlowPositions; sum: number };

const numericLiteralOrUnaryExpressionToValue = (node: t.Expression): number =>
    t.isNumericLiteral(node)
        ? node.value
        : (
            (
                t.isUnaryExpression(node) &&
                t.isNumericLiteral(node.argument) &&
                node.operator === "-"
            )
                ? -node.argument.value
                : 0
        );

function findNextNonEmptyFlow(
    flows: Array<Flow>,
    flow: Flow,
): Flow | null {
    if (flow.consequent.length > 0)
        return flow;

    const flowIndex = flows.indexOf(flow);
    if (flowIndex === -1)
        return null;

    for (let i = flowIndex + 1; i < flows.length; i++) {
        const nextFlow = flows[i];

        if (nextFlow.consequent.length > 0)
            return nextFlow;
    }

    return null;
}

export default {
    name: "ControlFlowFlattening",
    postRunWebcrack: false,
    scopableVisitor: () => ({
        on: {
            FunctionDeclaration(path) {
                const { node, scope } = path;

                if (!node.generator)
                    return;

                const { params, id: { name } } = node;

                const { length: paramsLength } = params;
                if (paramsLength === 0)
                    return;

                const binding = scope.getBinding(name);
                if (!binding)
                    return;

                const flowPositionParams = params.slice(0, paramsLength - 1);
                const lastParam = params[paramsLength - 1];

                const { referencePaths } = binding;

                if (referencePaths.length !== 1)
                    return;

                const { 0: cffStartFunction } = referencePaths;

                const { parent: cffStartCall } = cffStartFunction;

                if (!(
                    t.isCallExpression(cffStartCall) &&
                    cffStartCall.arguments.length === flowPositionParams.length
                ))
                    return;

                if (!(
                    flowPositionParams.every(node => t.isIdentifier(node)) &&
                    t.isAssignmentPattern(lastParam) &&
                    t.isIdentifier(lastParam.left) &&
                    t.isObjectExpression(lastParam.right)
                ))
                    return;

                const resultDeclaration = cffStartFunction.findParent(({ node }) => t.isVariableDeclaration(node));
                if (!(
                    resultDeclaration &&
                    t.isVariableDeclaration(resultDeclaration.node)
                ))
                    return;

                const { parent: resultDeclarationParent } = resultDeclaration as NodePath<t.VariableDeclaration>;

                if (!t.isBlock(resultDeclarationParent))
                    return;

                const { body: resultDeclarationParentBody } = resultDeclarationParent;

                const cffShouldReturnValueDeclarationPosition = resultDeclarationParentBody.indexOf(resultDeclaration.node) - 1;
                if (cffShouldReturnValueDeclarationPosition < 0)
                    return;

                const cffShouldReturnValueDeclaration = resultDeclarationParentBody[cffShouldReturnValueDeclarationPosition];
                if (!(
                    t.isVariableDeclaration(cffShouldReturnValueDeclaration) &&
                    cffShouldReturnValueDeclaration.declarations.length === 1 &&
                    t.isIdentifier(cffShouldReturnValueDeclaration.declarations[0].id)
                ))
                    return;

                const { id: { name: cffShouldReturnValueDeclarationName } } = cffShouldReturnValueDeclaration.declarations[0];

                const { left: { name: constantHolderName } } = lastParam;

                if (!(
                    lastParam.right.properties.length === 1 &&
                    t.isObjectProperty(lastParam.right.properties[0]) &&
                    t.isIdentifier(lastParam.right.properties[0].key) &&
                    t.isObjectExpression(lastParam.right.properties[0].value)
                ))
                    return;

                const { key: { name: constantHolderInternalPropertyName } } = lastParam.right.properties[0];

                // We determined that the path is CFF generator function

                const flowPositionParamNames = flowPositionParams.map(
                    param =>
                        t.isIdentifier(param)
                            ? param.name
                            : null,
                );

                const flowPositionParamNameSet = new Set(flowPositionParamNames);

                const isBinaryExpressionInvolvingAllConstantParams = (expression: t.Node): boolean => {
                    if (t.isIdentifier(expression))
                        return flowPositionParamNameSet.has(expression.name);

                    if (t.isBinaryExpression(expression) && expression.operator === "+")
                        return isBinaryExpressionInvolvingAllConstantParams(expression.left) &&
                            isBinaryExpressionInvolvingAllConstantParams(expression.right);

                    return false;
                };

                let cffDispatchSwitch: NodePath<t.SwitchStatement>;

                let constantHolderWithContextPropertyName: string;

                let cffLoop: NodePath<t.WhileStatement>;

                traverse(node, {
                    SwitchStatement(innerPath) {
                        const { node: { discriminant, cases } } = innerPath;

                        if (isBinaryExpressionInvolvingAllConstantParams(discriminant)) {
                            cffDispatchSwitch = innerPath;

                            cffLoop = innerPath.findParent(parent => parent.isWhileStatement()) as NodePath<t.WhileStatement>;

                            console.log("CFF dispatch switch and loop found, eliminating deadcode...");

                            // Remove statement after break or return
                            cases.forEach(({ consequent }) => {
                                for (let i = 0; i < consequent.length; i++)
                                    if (t.isReturnStatement(consequent[i])) {
                                        consequent.splice(i + 1, consequent.length - (i + 1));

                                        break;
                                    }

                                for (let i = 0; i < consequent.length; i++)
                                    if (t.isBreakStatement(consequent[i])) {
                                        consequent.splice(i + 1, consequent.length - (i + 1));

                                        break;
                                    }
                            });
                        }
                    },

                    WithStatement(innerPath) {
                        const { node: innerNode } = innerPath;

                        if (
                            t.isLogicalExpression(innerNode.object) &&
                            t.isMemberExpression(innerNode.object.left) &&
                            t.isIdentifier(innerNode.object.left.object, { name: constantHolderName }) &&
                            t.isIdentifier(innerNode.object.left.property) &&
                            t.isIdentifier(innerNode.object.right, { name: constantHolderName })
                        )
                            constantHolderWithContextPropertyName = innerNode.object.left.property.name;
                    },

                    ExpressionStatement(innerPath) {
                        const { node: innerNode, parent } = innerPath;
                        const { expression } = innerNode;

                        if (t.isAssignmentExpression(expression)) {
                            if (!(
                                t.isArrayPattern(expression.left) &&
                                t.isArrayExpression(expression.right)
                            ))
                                return;

                            if (!t.isSwitchCase(parent))
                                return;

                            const indexOfInnerNode = parent.consequent.indexOf(innerNode);
                            if (indexOfInnerNode === -1)
                                return;

                            expression.left.elements.forEach((element, i) => {
                                parent.consequent.splice(indexOfInnerNode, 0, t.expressionStatement(
                                    t.assignmentExpression(
                                        expression.operator,
                                        element as t.LVal,
                                        (expression.right as t.ArrayExpression).elements[i] as t.Expression,
                                    ),
                                ));
                            });

                            console.log("Simplified destructuring assignment to multiple assignments");

                            innerPath.remove();
                        }
                    },
                }, path.scope);

                // Dispatch switch not found
                if (!(cffDispatchSwitch && cffLoop))
                    return;

                { // Log informations
                    console.log("Constant holder:", constantHolderName);
                    console.log("Constant holder internal property:", constantHolderInternalPropertyName);
                    console.log("Constant holder with context property:", constantHolderWithContextPropertyName);
                }

                const { node: cffDispatchSwitchNode } = cffDispatchSwitch;

                const finalizeFlowStatements = (statements: Array<t.Statement>): Array<t.Statement> => {
                    statements = statements.filter(statement => !t.isBreakStatement(statement));

                    const removeStatementFromStatements = (statement: t.Statement) =>
                        statements = statements.filter(innerStatement => innerStatement !== statement);

                    statements.forEach(statement => {
                        if (isLiteralConstantsStepStatement(statement))
                            removeStatementFromStatements(statement);
                    });

                    statements.forEach((statement, i) => {
                        if (
                            t.isReturnStatement(statement) &&
                            statement.argument
                        ) {
                            const cffShouldReturnValueDeclarationTrueAssignment =
                                statements.slice(0, i)
                                    .find(node => (
                                        t.isExpressionStatement(node) &&
                                        t.isAssignmentExpression(node.expression) &&
                                        t.isIdentifier(node.expression.left, { name: cffShouldReturnValueDeclarationName }) &&
                                        t.isBooleanLiteral(node.expression.right) &&
                                        node.expression.right.value
                                    ));

                            if (cffShouldReturnValueDeclarationTrueAssignment)
                                removeStatementFromStatements(cffShouldReturnValueDeclarationTrueAssignment);
                            else
                                statements[i] = t.expressionStatement(statement.argument);
                        }
                    });

                    statements.forEach(statement => {
                        if (isFlowPositionStepStatement(statement))
                            removeStatementFromStatements(statement);
                    });

                    statements.forEach(statement => {
                        if (isStatementFlowWithContextChange(statement))
                            removeStatementFromStatements(statement);
                    });

                    return statements;
                };

                const summateFlowPositions = (flowPositions: FlowPositions): number =>
                    Object.values(flowPositions).reduce(
                        (accumulator, position) => accumulator + position,
                        0,
                    );

                const evaluteExpression = (
                    expression: t.Expression,
                    literalConstants: LiteralConstants,
                    flowPositions: FlowPositions,
                ) => {
                    const { code } = generate(expression);

                    const value = new Function(
                        ...flowPositionParamNameSet,
                        constantHolderName,
                        "return " + code,
                    )(
                        ...Object.values(flowPositions),
                        {
                            [constantHolderInternalPropertyName]: literalConstants,
                        },
                    );

                    // console.log(`Evaluted expression "${code}" ->`, value);

                    return value;
                };

                const dynamicallyComputeFlows = (
                    flows: Array<Flow>,
                    literalConstants: LiteralConstants,
                    flowPositions: FlowPositions,
                ) =>
                    flows.map(ourCase => {
                        if (ourCase.test) {
                            // We"re not going to replace test, because next dynamicComputeSwitchCasesWithFlowPositions call uses test

                            const clonedOurCase = t.cloneNode(ourCase, true);

                            clonedOurCase.test = t.valueToNode(evaluteExpression(ourCase.test, literalConstants, flowPositions));

                            return clonedOurCase;
                        }

                        return ourCase;
                    });

                const isLiteralConstantsStepStatement = (statement: t.Statement): statement is t.ExpressionStatement & {
                    expression: t.AssignmentExpression & {
                        left: t.MemberExpression & {
                            object: t.MemberExpression & {
                                object: t.Identifier;
                                property: t.Identifier;
                            };
                            property: t.Identifier;
                        };
                        right: t.Node;
                    };
                } =>
                    t.isExpressionStatement(statement) &&
                    t.isAssignmentExpression(statement.expression) &&
                    statement.expression.operator === "=" &&
                    t.isMemberExpression(statement.expression.left) &&
                    t.isMemberExpression(statement.expression.left.object) &&
                    t.isIdentifier(statement.expression.left.object.object, { name: constantHolderName }) &&
                    t.isIdentifier(statement.expression.left.object.property, { name: constantHolderInternalPropertyName }) &&
                    t.isIdentifier(statement.expression.left.property);

                const stepLiteralConstants = (
                    statements: Array<t.Statement>,
                    literalConstants: LiteralConstants,
                ) => {
                    for (const statement of statements)
                        if (isLiteralConstantsStepStatement(statement))
                            literalConstants[statement.expression.left.property.name] =
                                numericLiteralOrUnaryExpressionToValue(statement.expression.right);

                    return literalConstants;
                };

                const isFlowPositionStepStatement = (statement: t.Statement): statement is t.ExpressionStatement & {
                    expression: t.AssignmentExpression & {
                        operator: "+=";
                        left: t.Identifier;
                    };
                } =>
                    t.isExpressionStatement(statement) &&
                    t.isAssignmentExpression(statement.expression) &&
                    statement.expression.operator === "+=" &&
                    t.isIdentifier(statement.expression.left) &&
                    flowPositionParamNameSet.has(statement.expression.left.name);

                const stepFlowPositions = (
                    statements: Array<t.Statement>,
                    flowPositions: FlowPositions,
                ): FlowPositions => {
                    const steppedFlowPositions = structuredClone(flowPositions);

                    statements.forEach(statement => {
                        if (isFlowPositionStepStatement(statement))
                            steppedFlowPositions[statement.expression.left.name] +=
                                numericLiteralOrUnaryExpressionToValue(statement.expression.right);
                    });

                    return steppedFlowPositions;
                };

                const isStatementFlowWithContextChange = (statement: t.Statement): statement is t.ExpressionStatement & {
                    expression: t.AssignmentExpression & {
                        operator: "=";
                        left: t.MemberExpression & {
                            object: t.Identifier;
                            property: t.Identifier;
                        };
                        right: t.MemberExpression & {
                            object: t.Identifier;
                            property: t.Identifier;
                        };
                    };
                } =>
                    t.isExpressionStatement(statement) &&
                    t.isAssignmentExpression(statement.expression) &&
                    statement.expression.operator === "=" &&
                    t.isMemberExpression(statement.expression.left) &&
                    t.isIdentifier(statement.expression.left.object, { name: constantHolderName }) &&
                    t.isIdentifier(statement.expression.left.property, { name: constantHolderWithContextPropertyName }) &&
                    t.isMemberExpression(statement.expression.right) &&
                    t.isIdentifier(statement.expression.right.object, { name: constantHolderName }) &&
                    t.isIdentifier(statement.expression.right.property);

                const findLastFlowWithContextChange = (statements: Array<t.Statement>) => {
                    for (const statement of statements.reverse())
                        if (isStatementFlowWithContextChange(statement))
                            return statement.expression.right.property.name;

                    return null;
                };

                const computeFlowTransition = (
                    { consequent }: Flow,
                    literalConstants: LiteralConstants,
                    flowPositions: FlowPositions,
                ): FlowTransition => {
                    const flowBlockBody: Array<t.Statement> = new Array;

                    for (const statement of consequent) {
                        if ( // if (test) flow += x else flow += y
                            t.isIfStatement(statement) &&
                            t.isBlockStatement(statement.consequent) &&
                            statement.alternate
                        ) {
                            // If "if" appears, then statements will not appears after

                            const { test, consequent: innerConsequent, alternate } = statement;

                            const trueStatements =
                                t.isBlockStatement(innerConsequent)
                                    ? innerConsequent.body
                                    : [innerConsequent];

                            const falseStatements =
                                alternate
                                    ? (
                                        t.isBlockStatement(alternate)
                                            ? alternate.body
                                            : [alternate]
                                    )
                                    : [];

                            return {
                                type: "branch",
                                test,

                                trueLiteralConstants: stepLiteralConstants(trueStatements, structuredClone(literalConstants)),
                                falseLiteralConstants: stepLiteralConstants(falseStatements, structuredClone(literalConstants)),

                                trueFlowPositions: stepFlowPositions(trueStatements, flowPositions),
                                falseFlowPositions: stepFlowPositions(falseStatements, flowPositions),

                                trueFlowWithContextChange: findLastFlowWithContextChange(trueStatements),
                                falseFlowWithContextChange: findLastFlowWithContextChange(falseStatements),

                                remainBlockBody: flowBlockBody,
                            };
                        } else // Push statement to block body if not "if"
                            flowBlockBody.push(statement);

                        if (t.isReturnStatement(statement))
                            return { type: "end", flowBlockBody };

                        if (t.isBreakStatement(statement)) // If "if" not appears, its linear
                            break;

                        if (isLiteralConstantsStepStatement(statement))
                            literalConstants[statement.expression.left.property.name] =
                                numericLiteralOrUnaryExpressionToValue(statement.expression.right);

                        if (isFlowPositionStepStatement(statement))
                            flowPositions[statement.expression.left.name] +=
                                numericLiteralOrUnaryExpressionToValue(statement.expression.right);

                        // Replace "slKK7_c + -142" -> "143 + -142"
                        // This will simplified on last step (webcrack)
                        traverse(t.file(t.program([statement])), {
                            Identifier(path) {
                                if (
                                    path.isReferencedIdentifier() &&
                                    path.isIdentifier() &&
                                    flowPositionParamNameSet.has(path.node.name)
                                )
                                    path.replaceWith(t.valueToNode(flowPositions[path.node.name]));
                            },
                        });
                    }

                    return {
                        type: "linear",

                        literalConstants,

                        flowPositions,

                        flowWithContextChange: findLastFlowWithContextChange(consequent),

                        flowBlockBody,
                    };
                };

                const computeNextFlowState = (
                    literalConstants: LiteralConstants,
                    flowPositions: FlowPositions,
                ): FlowState | null => {
                    const flowPositionsSum = summateFlowPositions(flowPositions);

                    const dynamicFlows = dynamicallyComputeFlows(cffDispatchSwitchNode.cases, literalConstants, flowPositions);

                    const targetFlow =
                        dynamicFlows.find(ourCase => ourCase.test && flowPositionsSum === numericLiteralOrUnaryExpressionToValue(ourCase.test)) ||
                        dynamicFlows.find(ourCase => !ourCase.test);
                    if (!targetFlow)
                        return null;

                    const targetFlowTransition = computeFlowTransition(targetFlow, literalConstants, flowPositions);
                    if (targetFlowTransition.type !== "linear")
                        return null;

                    const { flowPositions: appliedFlowPositions, literalConstants: appliedLiteralConstants } = targetFlowTransition;

                    return {
                        flowPositions: appliedFlowPositions,
                        sum: summateFlowPositions(appliedFlowPositions),
                        literalConstants: appliedLiteralConstants,
                    };
                };

                const findMergeState = (
                    aLiteralConstants: LiteralConstants,
                    bLiteralConstants: LiteralConstants,

                    aFirstFlowPositions: FlowPositions,
                    bFirstFlowPositions: FlowPositions,
                ): number | null => {
                    const MAX_STEPS = 500;

                    const statesA: Array<FlowState> = [{ literalConstants: aLiteralConstants, flowPositions: structuredClone(aFirstFlowPositions), sum: summateFlowPositions(aFirstFlowPositions) }];
                    const statesB: Array<FlowState> = [{ literalConstants: bLiteralConstants, flowPositions: structuredClone(bFirstFlowPositions), sum: summateFlowPositions(bFirstFlowPositions) }];

                    // Follow the paths of A and B step by step and find if they have a common sum
                    // This is a heuristic approach, not a strict graph analysis
                    for (let i = 0; i < MAX_STEPS; i++) {
                        const { literalConstants: aLastLiteralConstants, flowPositions: aLastFlowPositions, sum: aLastSum } = statesA[statesA.length - 1];
                        const { literalConstants: bLastLiteralConstants, flowPositions: bLastFlowPositions, sum: bLastSum } = statesB[statesB.length - 1];

                        if (aLastSum === bLastSum)
                            return aLastSum;

                        const aNextFlowState = computeNextFlowState(aLastLiteralConstants, aLastFlowPositions);
                        if (!aNextFlowState)
                            break; // Dead end

                        statesA.push(aNextFlowState);

                        // Compute next step B
                        const bNextFlowState = computeNextFlowState(bLastLiteralConstants, bLastFlowPositions);
                        if (!bNextFlowState)
                            break;

                        statesB.push(bNextFlowState);

                        const iAdd1 = i + 1;

                        const { sum: aIAdd1Sum } = statesA[iAdd1];
                        const { sum: bIAdd1Sum } = statesB[iAdd1];

                        if (aIAdd1Sum === bIAdd1Sum)
                            return aIAdd1Sum;
                    }

                    return null;
                };

                const reconstructBlock = (
                    literalConstants: LiteralConstants,
                    flowPositions: FlowPositions,
                    stopAtFlowSum: number | null = null,
                    lastTargetFlowTransition: FlowTransition | null = null,
                ): Array<t.Statement> => {
                    const blockBody: Array<t.Statement> = new Array;

                    while (true) {
                        const flowPositionsSum = summateFlowPositions(flowPositions);

                        if (stopAtFlowSum !== null && flowPositionsSum === stopAtFlowSum)
                            break;

                        { // Detect end
                            const { test } = cffLoop.node;

                            if (!evaluteExpression(test, literalConstants, flowPositions)) {
                                console.log(`CFF Loop condition met (false) at sum ${flowPositionsSum}. Exiting flow`);

                                break;
                            }
                        }

                        const dynamicFlows = dynamicallyComputeFlows(cffDispatchSwitchNode.cases, literalConstants, flowPositions);

                        const targetFlow = findNextNonEmptyFlow(
                            dynamicFlows,
                            dynamicFlows.find(ourCase => ourCase.test && flowPositionsSum === numericLiteralOrUnaryExpressionToValue(ourCase.test)) ||
                            dynamicFlows.find(ourCase => !ourCase.test),
                        );
                        if (!targetFlow) {
                            console.log("Target flow not found, dead ended");

                            break; // Dead end
                        }

                        const targetFlowTransition = computeFlowTransition(targetFlow, literalConstants, flowPositions);

                        console.log("Reached flow:", flowPositionsSum, "type:", targetFlowTransition.type);

                        if (targetFlowTransition.type === "end") {
                            blockBody.push(...finalizeFlowStatements(targetFlowTransition.flowBlockBody));

                            break;
                        } else if (targetFlowTransition.type === "linear") {
                            blockBody.push(...finalizeFlowStatements(targetFlowTransition.flowBlockBody));

                            literalConstants = targetFlowTransition.literalConstants;
                            flowPositions = targetFlowTransition.flowPositions;
                        } else if (targetFlowTransition.type === "branch") {
                            console.log("Branch detected in CFF");

                            const {
                                trueLiteralConstants,
                                falseLiteralConstants,

                                trueFlowPositions,
                                falseFlowPositions,
                            } = targetFlowTransition;

                            const mergedSum = findMergeState(
                                trueLiteralConstants,
                                falseLiteralConstants,

                                trueFlowPositions,
                                falseFlowPositions,
                            );

                            const trueBlock = reconstructBlock(trueLiteralConstants, trueFlowPositions, mergedSum, lastTargetFlowTransition);
                            const falseBlock = reconstructBlock(falseLiteralConstants, falseFlowPositions, mergedSum, lastTargetFlowTransition);

                            blockBody.push(
                                ...finalizeFlowStatements(targetFlowTransition.remainBlockBody),
                                t.ifStatement(
                                    targetFlowTransition.test,
                                    t.blockStatement(trueBlock),
                                    t.blockStatement(falseBlock),
                                ),
                            );

                            if (mergedSum !== null) {
                                let tempFlowPositions = trueFlowPositions;
                                let tempLiteralConstants = trueLiteralConstants;

                                while (summateFlowPositions(tempFlowPositions) !== mergedSum) {
                                    const next = computeNextFlowState(tempLiteralConstants, tempFlowPositions);
                                    if (!next)
                                        break;

                                    tempFlowPositions = next.flowPositions;
                                    tempLiteralConstants = next.literalConstants;
                                }

                                flowPositions = tempFlowPositions;
                                literalConstants = tempLiteralConstants;
                            } else
                                break;
                        }

                        // Update last target flow transition
                        lastTargetFlowTransition = targetFlowTransition;
                    }

                    return blockBody;
                };

                const literalConstants: LiteralConstants = {};

                const flowPositions: Record<string, number> = {};

                cffStartCall.arguments.forEach((node, i) => {
                    flowPositions[flowPositionParamNames[i]] =
                        numericLiteralOrUnaryExpressionToValue(node as t.Expression);
                });

                // Finally we can replace body
                resultDeclarationParent.body = reconstructBlock(literalConstants, flowPositions);
            },
        },
        pre: null,

        final: null,
    }),
} satisfies Transform;