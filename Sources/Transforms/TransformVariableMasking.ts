import type { Transform } from "./Transform";

export default {
    name: "VariableMasking",
    postRunWebcrack: false,
    scopableVisitor: () => ({
        on: {},
        pre: null,

        final: null,
    }),
} satisfies Transform;