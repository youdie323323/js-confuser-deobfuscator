import generate from "@babel/generator";
import type { Transform } from "./Transform";
import * as t from "@babel/types";

export default {
    name: "Dispatcher",
    preRunWebcrack: false,
    postRunWebcrack: false,
    contextedVisitor: context => ({
        on: isEstimate => {
            const isNotEstimate = !isEstimate;

            return {
                
            };
        },
        pre: null,
        post: null,

        first: null,
        final: null,
    }),
} satisfies Transform;