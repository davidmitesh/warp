"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContinueToLoopCall = void 0;
const assert_1 = __importDefault(require("assert"));
const solc_typed_ast_1 = require("solc-typed-ast");
const mapper_1 = require("../../ast/mapper");
const astPrinter_1 = require("../../utils/astPrinter");
const nodeTemplates_1 = require("../../utils/nodeTemplates");
const utils_1 = require("./utils");
class ContinueToLoopCall extends mapper_1.ASTMapper {
    constructor(loopToContinueFunction) {
        super();
        this.loopToContinueFunction = loopToContinueFunction;
    }
    visitContinue(node, ast) {
        const containingFunction = node.getClosestParentByType(solc_typed_ast_1.FunctionDefinition);
        (0, assert_1.default)(containingFunction !== undefined, `Unable to find containing function for ${(0, astPrinter_1.printNode)(node)}`);
        const continueFunction = this.loopToContinueFunction.get(containingFunction.id);
        (0, assert_1.default)(continueFunction instanceof solc_typed_ast_1.FunctionDefinition, `Unable to find continue function for ${(0, astPrinter_1.printNode)(containingFunction)}`);
        ast.replaceNode(node, (0, nodeTemplates_1.createReturn)((0, utils_1.createLoopCall)(continueFunction, containingFunction.vParameters.vParameters, ast), containingFunction.vReturnParameters.id, ast));
    }
}
exports.ContinueToLoopCall = ContinueToLoopCall;
//# sourceMappingURL=continueToLoopCall.js.map