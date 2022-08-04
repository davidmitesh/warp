"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MathsOperationToFunction = void 0;
const solc_typed_ast_1 = require("solc-typed-ast");
const mapper_1 = require("../../ast/mapper");
const errors_1 = require("../../utils/errors");
const functionGeneration_1 = require("../../utils/functionGeneration");
const nodeTemplates_1 = require("../../utils/nodeTemplates");
const add_1 = require("../../warplib/implementations/maths/add");
const and_1 = require("../../warplib/implementations/maths/and_");
const bitwise_and_1 = require("../../warplib/implementations/maths/bitwise_and");
const bitwise_not_1 = require("../../warplib/implementations/maths/bitwise_not");
const bitwise_or_1 = require("../../warplib/implementations/maths/bitwise_or");
const div_1 = require("../../warplib/implementations/maths/div");
const eq_1 = require("../../warplib/implementations/maths/eq");
const exp_1 = require("../../warplib/implementations/maths/exp");
const ge_1 = require("../../warplib/implementations/maths/ge");
const gt_1 = require("../../warplib/implementations/maths/gt");
const le_1 = require("../../warplib/implementations/maths/le");
const lt_1 = require("../../warplib/implementations/maths/lt");
const mod_1 = require("../../warplib/implementations/maths/mod");
const mul_1 = require("../../warplib/implementations/maths/mul");
const negate_1 = require("../../warplib/implementations/maths/negate");
const neq_1 = require("../../warplib/implementations/maths/neq");
const or_1 = require("../../warplib/implementations/maths/or");
const shl_1 = require("../../warplib/implementations/maths/shl");
const shr_1 = require("../../warplib/implementations/maths/shr");
const sub_1 = require("../../warplib/implementations/maths/sub");
const xor_1 = require("../../warplib/implementations/maths/xor");
/* Note we also include mulmod and add mod here */
class MathsOperationToFunction extends mapper_1.ASTMapper {
    constructor() {
        super(...arguments);
        this.inUncheckedBlock = false;
    }
    visitUncheckedBlock(node, ast) {
        this.inUncheckedBlock = true;
        this.commonVisit(node, ast);
        this.inUncheckedBlock = false;
    }
    visitBinaryOperation(node, ast) {
        this.commonVisit(node, ast);
        const operatorMap = new Map([
            ['+', () => (0, add_1.functionaliseAdd)(node, this.inUncheckedBlock, ast)],
            ['-', () => (0, sub_1.functionaliseSub)(node, this.inUncheckedBlock, ast)],
            ['*', () => (0, mul_1.functionaliseMul)(node, this.inUncheckedBlock, ast)],
            ['/', () => (0, div_1.functionaliseDiv)(node, this.inUncheckedBlock, ast)],
            ['%', () => (0, mod_1.functionaliseMod)(node, ast)],
            ['**', () => (0, exp_1.functionaliseExp)(node, this.inUncheckedBlock, ast)],
            ['==', () => (0, eq_1.functionaliseEq)(node, ast)],
            ['!=', () => (0, neq_1.functionaliseNeq)(node, ast)],
            ['>=', () => (0, ge_1.functionaliseGe)(node, ast)],
            ['>', () => (0, gt_1.functionaliseGt)(node, ast)],
            ['<=', () => (0, le_1.functionaliseLe)(node, ast)],
            ['<', () => (0, lt_1.functionaliseLt)(node, ast)],
            ['&', () => (0, bitwise_and_1.functionaliseBitwiseAnd)(node, ast)],
            ['|', () => (0, bitwise_or_1.functionaliseBitwiseOr)(node, ast)],
            ['^', () => (0, xor_1.functionaliseXor)(node, ast)],
            ['<<', () => (0, shl_1.functionaliseShl)(node, ast)],
            ['>>', () => (0, shr_1.functionaliseShr)(node, ast)],
            ['&&', () => (0, and_1.functionaliseAnd)(node, ast)],
            ['||', () => (0, or_1.functionaliseOr)(node, ast)],
        ]);
        const thunk = operatorMap.get(node.operator);
        if (thunk === undefined) {
            throw new errors_1.NotSupportedYetError(`${node.operator} not supported yet`);
        }
        thunk();
    }
    visitUnaryOperation(node, ast) {
        this.commonVisit(node, ast);
        const operatorMap = new Map([
            ['-', () => (0, negate_1.functionaliseNegate)(node, ast)],
            ['~', () => (0, bitwise_not_1.functionaliseBitwiseNot)(node, ast)],
            ['!', () => replaceNot(node, ast)],
            [
                'delete',
                () => {
                    return;
                },
            ],
        ]);
        const thunk = operatorMap.get(node.operator);
        if (thunk === undefined) {
            throw new errors_1.NotSupportedYetError(`${node.operator} not supported yet`);
        }
        thunk();
    }
    visitFunctionCall(node, ast) {
        this.commonVisit(node, ast);
        if (node.vExpression instanceof solc_typed_ast_1.Identifier &&
            node.vExpression.vReferencedDeclaration === undefined) {
            console.log(node.vExpression.name);
            if (['mulmod', 'addmod'].includes(node.vExpression.name)) {
                const name = `warp_${node.vExpression.name}`;
                const cairoStub = (0, functionGeneration_1.createCairoFunctionStub)(name, [
                    ['x', (0, nodeTemplates_1.createUint256TypeName)(ast)],
                    ['y', (0, nodeTemplates_1.createUint256TypeName)(ast)],
                ], [['res', (0, nodeTemplates_1.createUint256TypeName)(ast)]], [], ast, node);
                const replacement = (0, functionGeneration_1.createCallToFunction)(cairoStub, node.vArguments, ast);
                ast.replaceNode(node, replacement);
                ast.registerImport(replacement, `warplib.maths.${node.vExpression.name}`, name);
            }
        }
    }
}
exports.MathsOperationToFunction = MathsOperationToFunction;
function replaceNot(node, ast) {
    ast.replaceNode(node, new solc_typed_ast_1.BinaryOperation(ast.reserveId(), node.src, node.typeString, '-', (0, nodeTemplates_1.createNumberLiteral)(1, ast, node.typeString), node.vSubExpression, node.raw));
}
//# sourceMappingURL=MathsOperationToFunction.js.map