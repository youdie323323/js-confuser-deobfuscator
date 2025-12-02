import type { Transform } from "./Transform";
import * as t from "@babel/types";

export default {
    name: "Preparation",
    postRunWebcrack: false,
    scopableVisitor: () => ({
        on: {
            // RegExp only. Others will simplified by webcrack at the last step

            NewExpression(path) {
                const { node: { callee, arguments: ourArguments } } = path;

                if (
                    t.isIdentifier(callee, { name: "RegExp" }) &&
                    ourArguments.length >= 1 &&
                    ourArguments.length <= 2 &&
                    t.isStringLiteral(ourArguments[0])
                ) {
                    const pattern = ourArguments[0].value;
                    const flags =
                        ourArguments[1] && t.isStringLiteral(ourArguments[1])
                            ? ourArguments[1].value
                            : "";

                    const regexLiteral = t.regExpLiteral(pattern, flags);

                    path.replaceWith(regexLiteral);
                }
            },
        },
        pre: null,

        final: null,
    }),
} satisfies Transform;