"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BreakToReturn = void 0;
const assert_1 = __importDefault(require("assert"));
const solc_typed_ast_1 = require("solc-typed-ast");
const mapper_1 = require("../../ast/mapper");
const astPrinter_1 = require("../../utils/astPrinter");
const nodeTemplates_1 = require("../../utils/nodeTemplates");
class BreakToReturn extends mapper_1.ASTMapper {
    visitBreak(node, ast) {
        const containingFunction = node.getClosestParentByType(solc_typed_ast_1.FunctionDefinition);
        (0, assert_1.default)(containingFunction !== undefined, `Unable to find containing function for ${(0, astPrinter_1.printNode)(node)}`);
        ast.replaceNode(node, (0, nodeTemplates_1.createReturn)(containingFunction.vParameters.vParameters, containingFunction.vReturnParameters.id, ast));
    }
}
exports.BreakToReturn = BreakToReturn;
//# sourceMappingURL=breakToReturn.js.map