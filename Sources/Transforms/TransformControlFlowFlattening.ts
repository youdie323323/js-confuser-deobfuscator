import type { Transform } from "./Transform";
import * as t from "@babel/types";
import type { NodePath } from "@babel/traverse";
import traverse from "@babel/traverse";
import generate from "@babel/generator";

type Flow = t.SwitchCase;

type FlowWithContext = string | null;

type FlowPositions = Record<string, number>;

const enum FlowTransitionType {
    LINEAR,
    BRANCH,
    END,
}

const FLOW_TRANSITION_TYPE_STRING: Record<FlowTransitionType, string> = {
    [FlowTransitionType.LINEAR]: "linear",
    [FlowTransitionType.BRANCH]: "branch",
    [FlowTransitionType.END]: "end",
};

type FlowTransition =
    | {
        type: FlowTransitionType.LINEAR;

        literalConstants: LiteralConstants;

        flowPositions: FlowPositions;

        flowWithContext: FlowWithContext;

        flowBlockBody: Array<t.Statement>;
    }
    | {
        type: FlowTransitionType.BRANCH;

        test: t.Expression;

        trueLiteralConstants: LiteralConstants;
        falseLiteralConstants: LiteralConstants;

        trueFlowPositions: FlowPositions;
        falseFlowPositions: FlowPositions;

        trueFlowWithContext: FlowWithContext;
        falseFlowWithContext: FlowWithContext;

        remainFlowBlockBody: Array<t.Statement>;
    }
    | {
        type: FlowTransitionType.END;

        flowBlockBody: Array<t.Statement>;
    };

interface FlowState {
    literalConstants: LiteralConstants;

    flowPositions: FlowPositions;

    flowWithContext: FlowWithContext;

    sum: number;
}

interface InnerCFFCallOneself {
    flowPositions: FlowPositions;

    // With context and literal constants is dynamic, but object is static. So we'll handle this in the code
}

type LiteralConstants = Record<string, number>;

type NumericLiteralOrMinusNumericUnaryExpression = t.NumericLiteral | (t.UnaryExpression & {
    argument: t.NumericLiteral & {
        operator: "-";
    };
});

export const numericLiteralOrMinusNumericUnaryExpressionToValue = (node: NumericLiteralOrMinusNumericUnaryExpression): number =>
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

export const isNumericLiteralOrMinusNumericUnaryExpression = (node: t.Node): node is NumericLiteralOrMinusNumericUnaryExpression =>
    t.isNumericLiteral(node) || (
        t.isUnaryExpression(node) &&
        t.isNumericLiteral(node.argument) &&
        node.operator === "-"
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

const isConstantHolderAssignmentPatternParam = (param: t.FunctionParameter): param is t.AssignmentPattern & {
    left: t.Identifier;
    right: t.ObjectExpression;
} =>
    t.isAssignmentPattern(param) &&
    t.isIdentifier(param.left) &&
    t.isObjectExpression(param.right);

export default {
    name: "ControlFlowFlattening",
    preRunWebcrack: false,
    postRunWebcrack: true,
    contextedVisitor: context => ({
        on: isEstimate => {
            const isNotEstimate = !isEstimate;

            return {
                FunctionDeclaration(path) {
                    const { node, scope } = path;

                    if (!node.generator)
                        return;

                    const {
                        params,
                        id: { name },
                    } = node;

                    const nameBinding = scope.getBinding(name);
                    if (!nameBinding)
                        return;

                    let { params: { length: paramsLength } } = node;

                    if (paramsLength === 0)
                        return;

                    let argumentsParam: t.Identifier;

                    { // Determine arguments parameter
                        const lastParam = params[paramsLength - 1];

                        if (t.isIdentifier(lastParam)) { // Last parameter is argument
                            argumentsParam = lastParam;

                            paramsLength--;
                        }
                    }

                    const flowPositionParams = params.slice(0, paramsLength - 1);
                    const constantHolderParam = params[paramsLength - 1];

                    const { referencePaths } = nameBinding;

                    const cffStartFunction =
                        referencePaths
                            .find(({ parent: innerParent }) =>
                                t.isCallExpression(innerParent) &&
                                innerParent.arguments.length === flowPositionParams.length,
                            ) as NodePath & { parent: t.CallExpression };
                    if (!cffStartFunction)
                        return;

                    const { parent: cffStartCall } = cffStartFunction;

                    if (!(
                        flowPositionParams.every(t.isIdentifier) &&
                        isConstantHolderAssignmentPatternParam(constantHolderParam)
                    ))
                        return;

                    const resultVariableDeclaration = cffStartFunction.findParent(({ node }) => t.isVariableDeclaration(node));

                    let cffShouldReturnValueDeclarationName: string;

                    if (
                        resultVariableDeclaration &&
                        resultVariableDeclaration.isVariableDeclaration()
                    ) {
                        const { parent: resultVariableDeclarationParent } = resultVariableDeclaration;

                        if (!t.isBlock(resultVariableDeclarationParent))
                            return;

                        const { body: resultVariableDeclarationParentBody } =
                            resultVariableDeclarationParent;

                        const cffShouldReturnValueVariableDeclarationPosition =
                            resultVariableDeclarationParentBody.indexOf(resultVariableDeclaration.node) - 1;
                        if (0 > cffShouldReturnValueVariableDeclarationPosition)
                            return;

                        const cffShouldReturnValueVariableDeclaration = resultVariableDeclarationParentBody[cffShouldReturnValueVariableDeclarationPosition];

                        if (!(
                            t.isVariableDeclaration(cffShouldReturnValueVariableDeclaration) &&
                            cffShouldReturnValueVariableDeclaration.declarations.length === 1 &&
                            t.isIdentifier(cffShouldReturnValueVariableDeclaration.declarations[0].id)
                        ))
                            return;

                        const { id: { name: innerCffShouldReturnValueDeclarationName } } = cffShouldReturnValueVariableDeclaration.declarations[0];

                        cffShouldReturnValueDeclarationName = innerCffShouldReturnValueDeclarationName;
                    }

                    if (!(
                        constantHolderParam.right.properties.length === 1 &&
                        t.isObjectProperty(constantHolderParam.right.properties[0]) &&
                        t.isIdentifier(constantHolderParam.right.properties[0].key) &&
                        t.isObjectExpression(constantHolderParam.right.properties[0].value)
                    ))
                        return;

                    const { left: { name: constantHolderName } } = constantHolderParam;

                    const { right: { properties: { 0: { key: { name: constantHolderInternalPropertyName } } } } } = constantHolderParam;

                    // We determined that the path is CFF function

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

                    let cffLoop: NodePath<t.WhileStatement>;

                    let constantHolderWithContextPropertyName: string;

                    path.traverse({
                        SwitchStatement(innerPath) {
                            const { node: { discriminant, cases } } = innerPath;

                            if (isBinaryExpressionInvolvingAllConstantParams(discriminant)) {
                                cffDispatchSwitch = innerPath;

                                cffLoop = innerPath.findParent(parent => parent.isWhileStatement()) as NodePath<t.WhileStatement>;

                                if (isNotEstimate) {
                                    console.log("Dispatch switch and loop found, eliminating deadcode...");

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
                            }
                        },

                        WithStatement(innerPath) {
                            const { node: { object } } = innerPath;

                            if (
                                t.isLogicalExpression(object) &&
                                t.isMemberExpression(object.left) &&
                                t.isIdentifier(object.left.object, { name: constantHolderName }) &&
                                t.isIdentifier(object.left.property) &&
                                t.isIdentifier(object.right, { name: constantHolderName })
                            )
                                constantHolderWithContextPropertyName = object.left.property.name;
                        },

                        ExpressionStatement(innerPath) {
                            if (isEstimate)
                                return;

                            const { node: innerNode, parent } = innerPath;
                            const { expression } = innerNode;

                            if (t.isAssignmentExpression(expression)) {
                                const { left, right } = expression;

                                if (!(
                                    t.isArrayPattern(left) &&
                                    t.isArrayExpression(right)
                                ))
                                    return;

                                if (!t.isSwitchCase(parent))
                                    return;

                                const indexOfInnerNode = parent.consequent.indexOf(innerNode);
                                if (indexOfInnerNode === -1)
                                    return;

                                left.elements.forEach((element, i) => {
                                    if (t.isLVal(element))
                                        parent.consequent.splice(indexOfInnerNode, 0, t.expressionStatement(
                                            t.assignmentExpression(
                                                expression.operator,
                                                element,
                                                right.elements[i] as t.Expression, // right.elements not including spread
                                            ),
                                        ));
                                });

                                console.log("Simplified destructuring assignment to multiple assignments");

                                innerPath.remove();
                            }
                        },
                    });

                    // Dispatch switch not found
                    if (!(cffDispatchSwitch && cffLoop))
                        return;

                    // A.k.a. constant holder
                    const defaultFlowWithContext: FlowWithContext = constantHolderName;

                    if (isNotEstimate) { // Log informations
                        console.log("Constant holder:", constantHolderName);
                        console.log("Constant holder internal property:", constantHolderInternalPropertyName);
                        console.log("Constant holder with context property:", constantHolderWithContextPropertyName);
                    }

                    const { node: cffDispatchSwitchNode } = cffDispatchSwitch;

                    const finalizeFlowStatements = (statements: Array<t.Statement>) => {
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

                        /*
                        const statementsBlockStatementProgramFile = t.file(t.program([t.blockStatement(statements)]));

                        traverse(statementsBlockStatementProgramFile, {
                            // _0x832C0F2._0xBE98C8._0x664DFF = X => let _0x664DFF = X
                            // _0xBE98C8._0x664DFF = X => let _0x664DFF = X
                            AssignmentExpression(innerPath) {
                                const { node: { left, right }, parentPath: innerParentPath } = innerPath;

                                if (!t.isMemberExpression(left))
                                    return;

                                const { object: leftObject, property: leftProperty } = left;

                                if (!t.isIdentifier(leftProperty))
                                    return;

                                // _0x832C0F2._0xBE98C8._0x664DFF = X
                                if (t.isMemberExpression(leftObject)) {
                                    const { object: leftObjectObject, property: leftObjectProperty } = leftObject;

                                    if (
                                        t.isIdentifier(leftObjectObject, { name: constantHolderName }) &&
                                        t.isIdentifier(leftObjectProperty, { name: constantHolderInternalPropertyName })
                                    ) {
                                        innerParentPath.replaceWith(
                                            t.variableDeclaration("let", [
                                                t.variableDeclarator(leftProperty, right),
                                            ]),
                                        );

                                        return;
                                    }
                                }

                                // _0xBE98C8._0x664DFF = X
                                if (t.isIdentifier(leftObject, { name: constantHolderInternalPropertyName }))
                                    innerParentPath.replaceWith(
                                        t.variableDeclaration("let", [
                                            t.variableDeclarator(leftProperty, right),
                                        ]),
                                    );
                            },
                        });

                        traverse(statementsBlockStatementProgramFile, { // Used as value
                            MemberExpression(innerPath) {
                                const { node: { object, property } } = innerPath;

                                if (!t.isIdentifier(property))
                                    return;

                                // _0x832C0F2._0xBE98C8._0x664DFF
                                if (t.isMemberExpression(object)) {
                                    const { object: objectObject, property: objectProperty } = object;

                                    if (
                                        t.isIdentifier(objectObject, { name: constantHolderName }) &&
                                        t.isIdentifier(objectProperty, { name: constantHolderInternalPropertyName })
                                    ) {
                                        innerPath.replaceWith(property);

                                        return;
                                    }
                                }

                                // _0xBE98C8._0x664DFF
                                if (t.isIdentifier(object, { name: constantHolderInternalPropertyName }))
                                    innerPath.replaceWith(property);
                            },
                        });
                        */

                        return statements;
                    };

                    const summateFlowPositions = (flowPositions: FlowPositions) =>
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

                        // TODO: too DANGEROUS!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

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

                        // console.log(`Evaluted expression "${code}" =>`, value);

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
                            right: NumericLiteralOrMinusNumericUnaryExpression;
                        };
                    } =>
                        t.isExpressionStatement(statement) &&
                        t.isAssignmentExpression(statement.expression) &&
                        statement.expression.operator === "=" &&
                        t.isMemberExpression(statement.expression.left) &&
                        t.isMemberExpression(statement.expression.left.object) &&
                        t.isIdentifier(statement.expression.left.object.object, { name: constantHolderName }) &&
                        t.isIdentifier(statement.expression.left.object.property, { name: constantHolderInternalPropertyName }) &&
                        t.isIdentifier(statement.expression.left.property) &&
                        isNumericLiteralOrMinusNumericUnaryExpression(statement.expression.right);

                    const stepLiteralConstants = (
                        statements: Array<t.Statement>,
                        literalConstants: LiteralConstants,
                    ) => {
                        statements.forEach(statement => {
                            if (isLiteralConstantsStepStatement(statement))
                                literalConstants[statement.expression.left.property.name] =
                                    numericLiteralOrMinusNumericUnaryExpressionToValue(statement.expression.right);
                        });

                        return literalConstants;
                    };

                    const isFlowPositionStepStatement = (statement: t.Statement): statement is t.ExpressionStatement & {
                        expression: t.AssignmentExpression & {
                            operator: "+=";
                            left: t.Identifier;
                            right: NumericLiteralOrMinusNumericUnaryExpression;
                        };
                    } =>
                        t.isExpressionStatement(statement) &&
                        t.isAssignmentExpression(statement.expression) &&
                        statement.expression.operator === "+=" &&
                        t.isIdentifier(statement.expression.left) &&
                        flowPositionParamNameSet.has(statement.expression.left.name) &&
                        isNumericLiteralOrMinusNumericUnaryExpression(statement.expression.right);

                    const stepFlowPositions = (
                        statements: Array<t.Statement>,
                        flowPositions: FlowPositions,
                    ) => {
                        statements.forEach(statement => {
                            if (isFlowPositionStepStatement(statement))
                                flowPositions[statement.expression.left.name] +=
                                    numericLiteralOrMinusNumericUnaryExpressionToValue(statement.expression.right);
                        });

                        return flowPositions;
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

                    const findLastFlowWithContext = (statements: Array<t.Statement>) => {
                        for (const statement of statements.reverse())
                            if (isStatementFlowWithContextChange(statement)) {
                                const flowWithContext = statement.expression.right.property.name;

                                if (isNotFakeFlowWithContext(flowWithContext))
                                    return flowWithContext;
                                else // Fake... TODO: include this information in branch information
                                    return defaultFlowWithContext;
                            }

                        return null;
                    };

                    const isNotFakeFlowWithContext =
                        (flowWithContext: FlowWithContext) =>
                            flowWithContext === constantHolderInternalPropertyName;

                    const computeFlowTransition = (
                        { consequent }: Flow,

                        literalConstants: LiteralConstants,

                        flowPositions: FlowPositions,

                        flowWithContext: FlowWithContext,
                    ): FlowTransition => {
                        const flowBlockBody = new Array<t.Statement>;

                        for (const statement of consequent) {
                            if ( // ConstantHolderInternalProperty[...] = function (...) { return cff(...).next().value; }
                                t.isExpressionStatement(statement) &&
                                t.isAssignmentExpression(statement.expression) &&
                                t.isFunctionExpression(statement.expression.right)
                            ) {
                                const { expression: { right: statementRight } } = statement;

                                const { body: { body: statementRightBody } } = statementRight;

                                const returnStatement = statementRightBody.find(t.isReturnStatement);

                                if (
                                    returnStatement &&
                                    returnStatement.argument
                                ) {
                                    const { argument: returnStatementArgument } = returnStatement;

                                    if (
                                        t.isMemberExpression(returnStatementArgument) &&
                                        t.isIdentifier(returnStatementArgument.property, { name: "value" }) &&
                                        t.isCallExpression(returnStatementArgument.object) &&
                                        t.isMemberExpression(returnStatementArgument.object.callee) &&
                                        t.isIdentifier(returnStatementArgument.object.callee.property, { name: "next" }) &&
                                        t.isCallExpression(returnStatementArgument.object.callee.object) &&
                                        t.isIdentifier(returnStatementArgument.object.callee.object.callee, { name })
                                    ) {
                                        const { object: { callee: { object: { arguments: returnStatementArgumentObjectCalleeObjectArguments } } } } =
                                            returnStatementArgument;

                                        const innerFlowPositions: FlowPositions = {};

                                        returnStatementArgumentObjectCalleeObjectArguments.forEach((argument, i) => {
                                            if (isNumericLiteralOrMinusNumericUnaryExpression(argument))
                                                innerFlowPositions[flowPositionParamNames[i]] =
                                                    numericLiteralOrMinusNumericUnaryExpressionToValue(argument);
                                        });

                                        { // Do grouped reconstruction
                                            console.group();

                                            const reconstructedBody = reconstructBlock(
                                                structuredClone(literalConstants),

                                                innerFlowPositions,

                                                defaultFlowWithContext,
                                            );

                                            console.log(generate(t.blockStatement(finalizeFlowStatements(reconstructedBody))).code);

                                            console.groupEnd();
                                        }
                                    }
                                }
                            }

                            traverse(t.file(t.program([statement])), {
                                // Replace "slKK7_c + -142" => "143 + -142"
                                // This will simplified on last step (webcrack)
                                Identifier(innerPath) {
                                    if (
                                        innerPath.isReferencedIdentifier() &&
                                        flowPositionParamNameSet.has(innerPath.node.name)
                                    )
                                        innerPath.replaceWith(t.valueToNode(flowPositions[innerPath.node.name]));
                                },
                            });

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

                                if (
                                    trueStatements.some(t.isReturnStatement) &&
                                    falseStatements.some(t.isReturnStatement)
                                ) {
                                    flowBlockBody.push(statement);

                                    return { type: FlowTransitionType.END, flowBlockBody };
                                }

                                return {
                                    type: FlowTransitionType.BRANCH,

                                    test,

                                    trueLiteralConstants: stepLiteralConstants(trueStatements, structuredClone(literalConstants)),
                                    falseLiteralConstants: stepLiteralConstants(falseStatements, structuredClone(literalConstants)),

                                    trueFlowPositions: stepFlowPositions(trueStatements, structuredClone(flowPositions)),
                                    falseFlowPositions: stepFlowPositions(falseStatements, structuredClone(flowPositions)),

                                    // If branches only includes jump statements, therefore just get last changed flow with context
                                    // If findLastFlowWithContext returns null, use previous (non) with context
                                    trueFlowWithContext: findLastFlowWithContext(trueStatements) || flowWithContext,
                                    falseFlowWithContext: findLastFlowWithContext(falseStatements) || flowWithContext,

                                    remainFlowBlockBody: flowBlockBody,
                                };
                            } else // Push statement to block body if not "if"
                                flowBlockBody.push(statement);

                            if (t.isReturnStatement(statement))
                                return { type: FlowTransitionType.END, flowBlockBody };

                            if (t.isBreakStatement(statement)) // If "if" not appears, its linear
                                break;

                            if (isLiteralConstantsStepStatement(statement))
                                literalConstants[statement.expression.left.property.name] =
                                    numericLiteralOrMinusNumericUnaryExpressionToValue(statement.expression.right);

                            if (isFlowPositionStepStatement(statement))
                                flowPositions[statement.expression.left.name] +=
                                    numericLiteralOrMinusNumericUnaryExpressionToValue(statement.expression.right);

                            if (isStatementFlowWithContextChange(statement)) {
                                flowWithContext = statement.expression.right.property.name;

                                if (isNotFakeFlowWithContext(flowWithContext))
                                    console.log("Linear flow with context changed:", flowWithContext);
                                else { // Fake flow with context...
                                    console.log("Fake linear flow with context change found, fallback to default:", `${flowWithContext} => ${defaultFlowWithContext}`);

                                    flowWithContext = defaultFlowWithContext;
                                }
                            }
                        }

                        return {
                            type: FlowTransitionType.LINEAR,

                            literalConstants,

                            flowPositions,

                            flowWithContext,

                            flowBlockBody,
                        };
                    };

                    const computeNextFlowState = (
                        literalConstants: LiteralConstants,
                        flowPositions: FlowPositions,
                        flowWithContext: FlowWithContext,
                    ): FlowState | null => {
                        const flowPositionsSum = summateFlowPositions(flowPositions);

                        const dynamicFlows = dynamicallyComputeFlows(cffDispatchSwitchNode.cases, literalConstants, flowPositions);

                        const targetFlow =
                            dynamicFlows.find(ourCase =>
                                ourCase.test &&
                                isNumericLiteralOrMinusNumericUnaryExpression(ourCase.test) &&
                                flowPositionsSum === numericLiteralOrMinusNumericUnaryExpressionToValue(ourCase.test),
                            ) ||
                            dynamicFlows.find(ourCase => !ourCase.test);
                        if (!targetFlow)
                            return null;

                        const targetFlowTransition = computeFlowTransition(targetFlow, literalConstants, flowPositions, flowWithContext);
                        if (targetFlowTransition.type !== FlowTransitionType.LINEAR)
                            return null;

                        const {
                            flowPositions: appliedFlowPositions,

                            literalConstants: appliedLiteralConstants,

                            flowWithContext: appliedFlowWithContext,
                        } = targetFlowTransition;

                        return {
                            literalConstants: appliedLiteralConstants,

                            flowPositions: appliedFlowPositions,

                            flowWithContext: appliedFlowWithContext,

                            sum: summateFlowPositions(appliedFlowPositions),
                        };
                    };

                    const findMergeState = (
                        aLiteralConstants: LiteralConstants,
                        bLiteralConstants: LiteralConstants,

                        aFlowPositions: FlowPositions,
                        bFlowPositions: FlowPositions,

                        aFlowWithContext: FlowWithContext,
                        bFlowWithContext: FlowWithContext,
                    ): number | null => {
                        const MAX_STEPS = 500;

                        const statesA: Array<FlowState> = [{
                            literalConstants: aLiteralConstants,

                            flowPositions: structuredClone(aFlowPositions),

                            flowWithContext: aFlowWithContext,

                            sum: summateFlowPositions(aFlowPositions),
                        }];
                        const statesB: Array<FlowState> = [{
                            literalConstants: bLiteralConstants,

                            flowPositions: structuredClone(bFlowPositions),

                            flowWithContext: bFlowWithContext,

                            sum: summateFlowPositions(bFlowPositions),
                        }];

                        // Follow the paths of A and B step by step and find if they have a common sum
                        // This is a heuristic approach, not a strict graph analysis
                        for (let i = 0; i < MAX_STEPS; i++) {
                            const {
                                literalConstants: aLastLiteralConstants,

                                flowPositions: aLastFlowPositions,

                                flowWithContext: aLastFlowWithContext,

                                sum: aLastSum,
                            } = statesA[statesA.length - 1];

                            const {
                                literalConstants: bLastLiteralConstants,

                                flowPositions: bLastFlowPositions,

                                flowWithContext: bLastFlowWithContext,

                                sum: bLastSum,
                            } = statesB[statesB.length - 1];

                            if (aLastSum === bLastSum)
                                return aLastSum;

                            const aNextFlowState = computeNextFlowState(aLastLiteralConstants, aLastFlowPositions, aLastFlowWithContext);
                            if (!aNextFlowState)
                                break; // Dead end

                            statesA.push(aNextFlowState);

                            // Compute next step B
                            const bNextFlowState = computeNextFlowState(bLastLiteralConstants, bLastFlowPositions, bLastFlowWithContext);
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

                        flowWithContext: FlowWithContext,

                        stopAtFlowSum: number | null = null,

                        lastTargetFlowTransition: FlowTransition | null = null,
                    ) => {
                        const blockBody: Array<t.Statement> = new Array;

                        while (true) {
                            const flowPositionsSum = summateFlowPositions(flowPositions);

                            if (stopAtFlowSum !== null && flowPositionsSum === stopAtFlowSum)
                                break;

                            { // Detect end
                                const { node: { test } } = cffLoop;

                                if (!evaluteExpression(test, literalConstants, flowPositions)) {
                                    console.log(`Loop condition met (false) at sum ${flowPositionsSum}, exiting flow`);

                                    break;
                                }
                            }

                            const dynamicFlows = dynamicallyComputeFlows(cffDispatchSwitchNode.cases, literalConstants, flowPositions);

                            const targetFlow = findNextNonEmptyFlow(
                                dynamicFlows,
                                dynamicFlows.find(ourCase =>
                                    ourCase.test &&
                                    isNumericLiteralOrMinusNumericUnaryExpression(ourCase.test) &&
                                    flowPositionsSum === numericLiteralOrMinusNumericUnaryExpressionToValue(ourCase.test),
                                ) ||
                                dynamicFlows.find(ourCase => !ourCase.test), // Default
                            );
                            if (!targetFlow) {
                                console.log("Target flow not found, dead ended");

                                break; // Dead end
                            }

                            const targetFlowTransition = computeFlowTransition(
                                targetFlow,

                                literalConstants,

                                flowPositions,

                                flowWithContext,
                            );

                            console.log("Reached flow:", flowPositionsSum, "type:", FLOW_TRANSITION_TYPE_STRING[targetFlowTransition.type]);

                            if (targetFlowTransition.type === FlowTransitionType.END) {
                                blockBody.push(...finalizeFlowStatements(targetFlowTransition.flowBlockBody));

                                break;
                            } else if (targetFlowTransition.type === FlowTransitionType.LINEAR) {
                                blockBody.push(...finalizeFlowStatements(targetFlowTransition.flowBlockBody));

                                literalConstants = targetFlowTransition.literalConstants;
                                flowPositions = targetFlowTransition.flowPositions;
                            } else if (targetFlowTransition.type === FlowTransitionType.BRANCH) {
                                const {
                                    test,

                                    trueLiteralConstants,
                                    falseLiteralConstants,

                                    trueFlowPositions,
                                    falseFlowPositions,

                                    trueFlowWithContext,
                                    falseFlowWithContext,

                                    remainFlowBlockBody,
                                } = targetFlowTransition;

                                { // Log branch information
                                    console.log("Branch information:");

                                    console.group();

                                    { // If
                                        console.log("if:");

                                        {
                                            console.group();

                                            console.log("Literal constants:", JSON.stringify(trueLiteralConstants));
                                            console.log("Flow positions:   ", JSON.stringify(trueFlowPositions));
                                            console.log("Flow with context:", trueFlowWithContext);

                                            console.groupEnd();
                                        }
                                    }

                                    { // Else
                                        console.log("else:");

                                        {
                                            console.group();

                                            console.log("Literal constants:", JSON.stringify(falseLiteralConstants));
                                            console.log("Flow positions:   ", JSON.stringify(falseFlowPositions));
                                            console.log("Flow with context:", falseFlowWithContext);

                                            console.groupEnd();
                                        }
                                    }

                                    console.groupEnd();
                                }

                                const mergedSum = findMergeState(
                                    trueLiteralConstants,
                                    falseLiteralConstants,

                                    trueFlowPositions,
                                    falseFlowPositions,

                                    trueFlowWithContext,
                                    falseFlowWithContext,
                                );

                                const trueBlock = reconstructBlock(
                                    trueLiteralConstants,

                                    trueFlowPositions,

                                    trueFlowWithContext,

                                    mergedSum,

                                    lastTargetFlowTransition,
                                );
                                const falseBlock = reconstructBlock(
                                    falseLiteralConstants,

                                    falseFlowPositions,

                                    falseFlowWithContext,

                                    mergedSum,

                                    lastTargetFlowTransition,
                                );

                                blockBody.push(
                                    ...finalizeFlowStatements(remainFlowBlockBody),
                                    t.ifStatement(
                                        test,
                                        t.blockStatement(trueBlock),
                                        t.blockStatement(falseBlock),
                                    ),
                                );

                                if (mergedSum !== null) {
                                    let tempFlowPositions = trueFlowPositions,
                                        tempLiteralConstants = trueLiteralConstants,
                                        tempFlowWithContext = trueFlowWithContext;

                                    while (summateFlowPositions(tempFlowPositions) !== mergedSum) {
                                        const next = computeNextFlowState(tempLiteralConstants, tempFlowPositions, tempFlowWithContext);
                                        if (!next)
                                            break;

                                        [
                                            tempFlowPositions,
                                            tempLiteralConstants,
                                            tempFlowWithContext,
                                        ] =
                                            [
                                                next.flowPositions,
                                                next.literalConstants,
                                                next.flowWithContext,
                                            ];
                                    }

                                    [
                                        flowPositions,
                                        literalConstants,
                                        flowWithContext,
                                    ] =
                                        [
                                            tempFlowPositions,
                                            tempLiteralConstants,
                                            tempFlowWithContext,
                                        ];
                                } else
                                    break;
                            }

                            // Update last target flow transition
                            lastTargetFlowTransition = targetFlowTransition;
                        }

                        return blockBody;
                    };

                    if (isNotEstimate) {
                        const literalConstants: LiteralConstants = {};

                        const flowPositions: Record<string, number> = {};

                        const { arguments: cffStartCallArguments } = cffStartCall;

                        cffStartCallArguments.forEach((argument, i) => {
                            if (isNumericLiteralOrMinusNumericUnaryExpression(argument))
                                flowPositions[flowPositionParamNames[i]] =
                                    numericLiteralOrMinusNumericUnaryExpressionToValue(argument);
                        });

                        const { node: blockParentNode } =
                            path.findParent(path => path.isBlock()) as NodePath<t.Block>;

                        // Finally we can replace body
                        blockParentNode.body = reconstructBlock(
                            literalConstants,

                            flowPositions,

                            defaultFlowWithContext,
                        );

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
    }),
} satisfies Transform;