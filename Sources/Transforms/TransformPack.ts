import type { Transform } from "./Transform";
import * as t from "@babel/types";
import * as parser from "@babel/parser";

export default {
    name: "Pack",
    postRunWebcrack: true,
    scopableVisitor: () => {
        return {
            on: {
                Program(path) {
                    const { node } = path;

                    const lastStatement = node.body[node.body.length - 1];

                    if (
                        t.isExpressionStatement(lastStatement) &&
                        t.isCallExpression(lastStatement.expression) &&
                        t.isCallExpression(lastStatement.expression.callee) &&
                        t.isIdentifier(lastStatement.expression.callee.callee, { name: "Function" }) &&
                        lastStatement.expression.arguments.length === 1 &&
                        lastStatement.expression.callee.arguments.length === 2
                    ) {
                        const { arguments: lastCallStatementCalleeArguments } = lastStatement.expression.callee;

                        const lastCallStatementCalleeArgumentsLast = lastCallStatementCalleeArguments[1];

                        if (t.isStringLiteral(lastCallStatementCalleeArgumentsLast)) {
                            const { program: lastCallStatementCalleeArgumentsLastValueParsedProgram } =
                                parser.parse(lastCallStatementCalleeArgumentsLast.value);

                            path.replaceWith(lastCallStatementCalleeArgumentsLastValueParsedProgram);
                        }
                    }
                },
            },
            pre: null,

            final: null,
        };
    },
} satisfies Transform;