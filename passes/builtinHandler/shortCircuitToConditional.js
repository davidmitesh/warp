"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShortCircuitToConditional = void 0;
const solc_typed_ast_1 = require("solc-typed-ast");
const mapper_1 = require("../../ast/mapper");
const nodeTemplates_1 = require("../../utils/nodeTemplates");
const utils_1 = require("../../utils/utils");
class ShortCircuitToConditional extends mapper_1.ASTMapper {
    visitBinaryOperation(node, ast) {
        this.commonVisit(node, ast);
        if (node.operator == '&&' && (0, utils_1.expressionHasSideEffects)(node.vRightExpression)) {
            const replacementExpression = new solc_typed_ast_1.Conditional(ast.reserveId(), node.src, 'bool', node.vLeftExpression, node.vRightExpression, (0, nodeTemplates_1.createBoolLiteral)(false, ast));
            ast.replaceNode(node, replacementExpression);
        }
        if (node.operator == '||' && (0, utils_1.expressionHasSideEffects)(node.vRightExpression)) {
            const replacementExpression = new solc_typed_ast_1.Conditional(ast.reserveId(), node.src, 'bool', node.vLeftExpression, (0, nodeTemplates_1.createBoolLiteral)(true, ast), node.vRightExpression);
            ast.replaceNode(node, replacementExpression);
        }
    }
}
exports.ShortCircuitToConditional = ShortCircuitToConditional;
//# sourceMappingURL=shortCircuitToConditional.js.map