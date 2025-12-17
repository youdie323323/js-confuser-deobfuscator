import { type Transform } from "./Transform";
import * as t from "@babel/types";
import { isFalsePredicate } from "./TransformOpaquePredicates";
import generate from "@babel/generator";

export default {
    name: "DeadCode",
    preRunWebcrack: false,
    postRunWebcrack: true,
    contextedVisitor: context => {
        return {
            on: isEstimate => {
                const isNotEstimate = !isEstimate;

                return {
                    IfStatement(path) {
                        const { node } = path;

                        const testPath = path.get("test");

                        if (isFalsePredicate(testPath))
                            if (isNotEstimate) {
                                path.get("consequent").traverse({
                                    CallExpression(innerPath) {
                                        const { node: { callee }, scope: innerScope } = innerPath;

                                        if (!t.isIdentifier(callee))
                                            return;

                                        const { name: calleeName } = callee;

                                        const calleeNameBinding = innerScope.getBinding(calleeName);
                                        if (!calleeNameBinding)
                                            return;

                                        const { path: calleeNameBindingPath } = calleeNameBinding;

                                        if (calleeNameBindingPath.isFunctionDeclaration()) {
                                            calleeNameBindingPath.remove();

                                            console.log("Removed dead function:", calleeName);
                                        }
                                    },
                                });

                                if (node.alternate)
                                    t.isBlockStatement(node.alternate)
                                        ? path.replaceWithMultiple(node.alternate.body)
                                        : path.replaceWith(node.alternate);
                                else
                                    path.remove();

                                { // Log
                                    const { code: testCode } = generate(testPath.node);

                                    console.log(`Dead code removed, false predicate: "${testCode}"`);
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
        };
    },
} satisfies Transform;