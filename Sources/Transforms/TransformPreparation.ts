import generate from "@babel/generator";
import type { Transform } from "./Transform";
import * as t from "@babel/types";

export default {
    name: "Preparation",
    preRunWebcrack: false,
    postRunWebcrack: false,
    contextedVisitor: context => ({
        on: isEstimate => {
            const isNotEstimate = !isEstimate;

            return {
                // RegExp only. Others will simplified by webcrack at the last step

                NewExpression(path) {
                    const { node, node: { callee, arguments: ourArguments } } = path;

                    if (
                        t.isIdentifier(callee, { name: "RegExp" }) &&
                        ourArguments.length >= 1 &&
                        ourArguments.length <= 2 &&
                        t.isStringLiteral(ourArguments[0])
                    )
                        if (isNotEstimate) {
                            const { value: pattern } = ourArguments[0],
                                flags =
                                    ourArguments[1] && t.isStringLiteral(ourArguments[1])
                                        ? ourArguments[1].value
                                        : "";

                            const regexLiteral = t.regExpLiteral(pattern, flags);

                            path.replaceWith(regexLiteral);

                            { // Log
                                const { code: nodeCode } = generate(node),
                                    { code: regexLiteralCode } = generate(regexLiteral);

                                console.log(`Simplified RegExp constructor: ${nodeCode} -> ${regexLiteralCode}`);
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
    }),
} satisfies Transform;