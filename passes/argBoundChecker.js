"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArgBoundChecker = void 0;
const solc_typed_ast_1 = require("solc-typed-ast");
const mapper_1 = require("../ast/mapper");
const utils_1 = require("../utils/utils");
const assert_1 = __importDefault(require("assert"));
const nodeTemplates_1 = require("../utils/nodeTemplates");
const nodeTypeProcessing_1 = require("../utils/nodeTypeProcessing");
class ArgBoundChecker extends mapper_1.ASTMapper {
    // Function to add passes that should have been run before this pass
    addInitialPassPrerequisites() {
        const passKeys = new Set([]);
        passKeys.forEach((key) => this.addPassPrerequisite(key));
    }
    visitContractDefinition(node, ast) {
        if (node.kind === solc_typed_ast_1.ContractKind.Interface) {
            return;
        }
        this.commonVisit(node, ast);
    }
    visitFunctionDefinition(node, ast) {
        if ((0, utils_1.isExternallyVisible)(node) && node.vBody !== undefined) {
            node.vParameters.vParameters.forEach((decl) => {
                const type = (0, solc_typed_ast_1.getNodeType)(decl, ast.compilerVersion);
                if ((0, nodeTypeProcessing_1.checkableType)(type)) {
                    const functionCall = ast
                        .getUtilFuncGen(node)
                        .boundChecks.inputCheck.gen(decl, type, node);
                    this.insertFunctionCall(node, functionCall, ast);
                }
            });
        }
        this.commonVisit(node, ast);
    }
    insertFunctionCall(node, funcCall, ast) {
        const body = node.vBody;
        (0, assert_1.default)(body !== undefined && funcCall.vArguments !== undefined);
        const expressionStatement = (0, nodeTemplates_1.createExpressionStatement)(ast, funcCall);
        body.insertAtBeginning(expressionStatement);
        ast.setContextRecursive(expressionStatement);
    }
    visitFunctionCall(node, ast) {
        if (node.kind === solc_typed_ast_1.FunctionCallKind.TypeConversion &&
            node.vReferencedDeclaration instanceof solc_typed_ast_1.EnumDefinition &&
            (0, solc_typed_ast_1.getNodeType)(node.vArguments[0], ast.compilerVersion) instanceof solc_typed_ast_1.IntType) {
            const enumDef = node.vReferencedDeclaration;
            const enumCheckFuncCall = ast
                .getUtilFuncGen(node)
                .boundChecks.enums.gen(node, node.vArguments[0], enumDef, node);
            const parent = node.parent;
            ast.replaceNode(node, enumCheckFuncCall, parent);
        }
        this.commonVisit(node, ast);
    }
}
exports.ArgBoundChecker = ArgBoundChecker;
//# sourceMappingURL=argBoundChecker.js.map