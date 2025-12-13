import type { Transform } from "./Transform";
import * as t from "@babel/types";
import * as parser from "@babel/parser";

function truncateString(string: string, n: number) {
    return string.length > n
        ? string.slice(0, n) + "..."
        : string;
}

export default {
    name: "Pack",
    preRunWebcrack: false,
    postRunWebcrack: true,
    contextedVisitor: context => {
        return {
            on: isEstimate => {
                const isNotEstimate = !isEstimate;

                return {
                    Program(path) {
                        const { node: { body } } = path;

                        const lastStatement = body[body.length - 1];

                        if (
                            t.isExpressionStatement(lastStatement) &&
                            t.isCallExpression(lastStatement.expression) &&
                            t.isCallExpression(lastStatement.expression.callee) &&
                            t.isIdentifier(lastStatement.expression.callee.callee, { name: "Function" }) &&
                            lastStatement.expression.arguments.length === 1 &&
                            lastStatement.expression.callee.arguments.length === 2
                        ) {
                            const { expression: { callee: { arguments: lastCallStatementCalleeArguments } } } = lastStatement;

                            const { 1: lastCallStatementCalleeArgumentsLast } = lastCallStatementCalleeArguments;

                            if (t.isStringLiteral(lastCallStatementCalleeArgumentsLast))
                                if (isNotEstimate) {
                                    const { value: lastCallStatementCalleeArgumentsLastValue } =
                                        lastCallStatementCalleeArgumentsLast;

                                    // Wrap in IIFE, since may lastCallStatementCalleeArgumentsLastValue has return
                                    const { program: lastCallStatementCalleeArgumentsLastValueParsedProgram } =
                                        parser.parse(`(function () { ${lastCallStatementCalleeArgumentsLastValue} })();`);

                                    path.replaceWith(lastCallStatementCalleeArgumentsLastValueParsedProgram);

                                    { // Log
                                        console.log("Unpacked the program:", `"${truncateString(lastCallStatementCalleeArgumentsLastValue, 50)}"`);
                                    }

                                    context.targetCount--;
                                } else
                                    context.targetCount++;
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