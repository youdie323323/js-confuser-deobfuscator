import type { Visitor } from "@babel/traverse";
import * as parser from "@babel/parser";
import type * as t from "@babel/types";
import traverse from "@babel/traverse";
import { webcrack } from "webcrack";
import generate from "@babel/generator";

import pack from "./TransformPack";
import astScrambler from "./TransformASTScrambler";
import shuffle from "./TransformShuffle";
import duplicateLiteralsRemoval from "./TransformDuplicateLiteralsRemoval";
import variableMasking from "./TransformVariableMasking";
import controlFlowFlattening from "./TransformControlFlowFlattening";
import preparation from "./TransformPreparation";

/*
 Irreversible transformations:
    objectExtraction
    renameVariables
    renameLabels
    movedDeclarations
*/

// This is ordered. Don't change
export const ALL: Array<Transform> = [
    pack,
    astScrambler,
    shuffle,
    duplicateLiteralsRemoval,
    variableMasking,
    controlFlowFlattening,
    preparation,
];

/**
 * Apply all transforms to parse result.
 * 
 * @remarks
 * This changes caller's value.
 */
export async function applyAll(ast: parser.ParseResult<t.File>) {
    const finalVisitors: Array<Visitor> = new Array;

    for (const {
        name,
        postRunWebcrack,
        scopableVisitor,
    } of ALL) {
        const { on, pre, final } = scopableVisitor();

        if (pre) // Run pre-visitor
            traverse(ast, pre);

        // Run visitor
        traverse(ast, on);

        if (postRunWebcrack) { // Run webcrack
            const { code: generatedASTCode } = generate(ast);
            const { code: webcrackedGeneratedASTCode } = await webcrack(generatedASTCode);

            ast.program = parser.parse(webcrackedGeneratedASTCode).program;
        }

        if (final) // Push final visitor
            finalVisitors.push(final);
    }

    // Execute final visitors
    finalVisitors.forEach(visitor => traverse(ast, visitor));
}

export interface Transform {
    name: string;
    postRunWebcrack: boolean;
    scopableVisitor: () => {
        on: Visitor;
        pre: Visitor | null;

        final: Visitor | null;
    };
}