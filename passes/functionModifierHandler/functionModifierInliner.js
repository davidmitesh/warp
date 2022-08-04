"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FunctionModifierInliner = void 0;
const solc_typed_ast_1 = require("solc-typed-ast");
const mapper_1 = require("../../ast/mapper");
const functionGeneration_1 = require("../../utils/functionGeneration");
const nodeTemplates_1 = require("../../utils/nodeTemplates");
const utils_1 = require("../../utils/utils");
/*  ModifierInliner starts to walk the ast through a Modifier node as a root.
    Whenever it reaches a placeholder, it replaces it with a call to `currentFunction`.
    When it reaches a return statement, it is replaced with a new return accordingly
    with `retVariables`
*/
class FunctionModifierInliner extends mapper_1.ASTMapper {
    constructor(node, parameters, retParams) {
        super();
        this.currentFunction = node;
        this.parameters = parameters;
        this.retVariables = retParams.vParameters;
        this.retParamsId = retParams.id;
    }
    visitPlaceholderStatement(node, ast) {
        const args = this.parameters.map((v) => (0, nodeTemplates_1.createIdentifier)(v, ast, undefined, this.currentFunction));
        const resultIdentifiers = this.retVariables.map((v) => (0, nodeTemplates_1.createIdentifier)(v, ast, undefined, this.currentFunction));
        const assignmentValue = (0, utils_1.toSingleExpression)(resultIdentifiers, ast);
        ast.replaceNode(node, new solc_typed_ast_1.ExpressionStatement(ast.reserveId(), node.src, this.retVariables.length === 0
            ? (0, functionGeneration_1.createCallToFunction)(this.currentFunction, args, ast)
            : new solc_typed_ast_1.Assignment(ast.reserveId(), '', assignmentValue.typeString, '=', assignmentValue, (0, functionGeneration_1.createCallToFunction)(this.currentFunction, args, ast)), node.documentation, node.raw));
    }
    visitReturn(node, ast) {
        ast.replaceNode(node, (0, nodeTemplates_1.createReturn)(this.retVariables, this.retParamsId, ast));
    }
}
exports.FunctionModifierInliner = FunctionModifierInliner;
//# sourceMappingURL=functionModifierInliner.js.map