"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MsgSender = void 0;
const solc_typed_ast_1 = require("solc-typed-ast");
const mapper_1 = require("../../ast/mapper");
const functionGeneration_1 = require("../../utils/functionGeneration");
const nodeTemplates_1 = require("../../utils/nodeTemplates");
class MsgSender extends mapper_1.ASTMapper {
    visitMemberAccess(node, ast) {
        if (node.vExpression instanceof solc_typed_ast_1.Identifier &&
            node.vExpression.name === 'msg' &&
            node.vExpression.vIdentifierType === solc_typed_ast_1.ExternalReferenceType.Builtin &&
            node.memberName === 'sender') {
            const replacementCall = (0, functionGeneration_1.createCallToFunction)((0, functionGeneration_1.createCairoFunctionStub)('get_caller_address', [], [['address', (0, nodeTemplates_1.createAddressTypeName)(false, ast)]], ['syscall_ptr'], ast, node), [], ast);
            ast.replaceNode(node, replacementCall);
            ast.registerImport(replacementCall, 'starkware.starknet.common.syscalls', 'get_caller_address');
        }
        // Fine to recurse because there is a check that the member access is a Builtin. Therefor a.msg.sender should
        // not be picked up.
        this.visitExpression(node, ast);
    }
}
exports.MsgSender = MsgSender;
//# sourceMappingURL=msgSender.js.map