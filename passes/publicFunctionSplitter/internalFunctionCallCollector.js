"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isInternalFuncCall = exports.InternalFunctionCallCollector = void 0;
const assert = require("assert");
const solc_typed_ast_1 = require("solc-typed-ast");
const mapper_1 = require("../../ast/mapper");
class InternalFunctionCallCollector extends mapper_1.ASTMapper {
    /*
    This class collects all functions which are internal. This is used in later sub-passes to
    avoid splitting public functions with no internal calls. This produces cleaner Cairo code
    and lessens the step and line counts.
    
    All public Solidity functions which have no internal calls pointing to them will be modified
    to be external only functions.
    */
    constructor(internalFunctionCallSet) {
        super();
        this.internalFunctionCallSet = internalFunctionCallSet;
    }
    visitFunctionCall(node, ast) {
        const funcDef = node.vReferencedDeclaration;
        if (funcDef instanceof solc_typed_ast_1.FunctionDefinition &&
            node.kind === solc_typed_ast_1.FunctionCallKind.FunctionCall &&
            isInternalFuncCall(node, ast)) {
            if (node.vExpression instanceof solc_typed_ast_1.MemberAccess) {
                const typeNode = (0, solc_typed_ast_1.getNodeType)(node.vExpression.vExpression, ast.compilerVersion);
                if (typeNode instanceof solc_typed_ast_1.UserDefinedType &&
                    typeNode.definition instanceof solc_typed_ast_1.ContractDefinition) {
                    this.commonVisit(node, ast);
                    return;
                }
            }
            this.internalFunctionCallSet.add(funcDef);
        }
        this.commonVisit(node, ast);
    }
}
exports.InternalFunctionCallCollector = InternalFunctionCallCollector;
function isInternalFuncCall(node, ast) {
    const type = (0, solc_typed_ast_1.getNodeType)(node.vExpression, ast.compilerVersion);
    assert(type instanceof solc_typed_ast_1.FunctionType);
    return type.visibility === 'internal';
}
exports.isInternalFuncCall = isInternalFuncCall;
//# sourceMappingURL=internalFunctionCallCollector.js.map