"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExternalReturnReceiver = void 0;
const solc_typed_ast_1 = require("solc-typed-ast");
const mapper_1 = require("../../ast/mapper");
const cloning_1 = require("../../utils/cloning");
const nodeTemplates_1 = require("../../utils/nodeTemplates");
class ExternalReturnReceiver extends mapper_1.ASTMapper {
    visitVariableDeclarationStatement(node, ast) {
        const receivesExternalReturn = node.vInitialValue instanceof solc_typed_ast_1.FunctionCall &&
            node.vInitialValue.vReferencedDeclaration instanceof solc_typed_ast_1.FunctionDefinition &&
            node.vInitialValue.vReferencedDeclaration.visibility === solc_typed_ast_1.FunctionVisibility.External;
        if (!receivesExternalReturn) {
            return this.commonVisit(node, ast);
        }
        node.vDeclarations
            .filter((decl) => decl.storageLocation !== solc_typed_ast_1.DataLocation.CallData &&
            decl.storageLocation !== solc_typed_ast_1.DataLocation.Default)
            .forEach((decl) => {
            const [statement, newId] = generateCopyStatement(decl, ast);
            ast.insertStatementAfter(node, statement);
            node.assignments = node.assignments.map((value) => (value === decl.id ? newId : value));
        });
        node.vDeclarations
            .filter((decl) => decl.storageLocation === solc_typed_ast_1.DataLocation.CallData)
            .forEach((decl) => {
            const [statement, newId] = generatePackStatement(decl, ast);
            ast.insertStatementAfter(node, statement);
            node.assignments = node.assignments.map((value) => (value === decl.id ? newId : value));
        });
    }
}
exports.ExternalReturnReceiver = ExternalReturnReceiver;
function generateCopyStatement(decl, ast) {
    const callDataDecl = (0, cloning_1.cloneASTNode)(decl, ast);
    callDataDecl.storageLocation = solc_typed_ast_1.DataLocation.CallData;
    callDataDecl.name = `${callDataDecl.name}_cd`;
    ast.replaceNode(decl, callDataDecl);
    return [
        new solc_typed_ast_1.VariableDeclarationStatement(ast.reserveId(), '', [decl.id], [decl], (0, nodeTemplates_1.createIdentifier)(callDataDecl, ast)),
        callDataDecl.id,
    ];
}
function generatePackStatement(decl, ast) {
    const callDataRawDecl = (0, cloning_1.cloneASTNode)(decl, ast);
    callDataRawDecl.name = `${callDataRawDecl.name}_raw`;
    const packExpression = ast
        .getUtilFuncGen(decl)
        .calldata.dynArrayStructConstructor.gen(callDataRawDecl, decl);
    ast.replaceNode(decl, callDataRawDecl);
    return [
        new solc_typed_ast_1.VariableDeclarationStatement(ast.reserveId(), '', [decl.id], [decl], packExpression),
        callDataRawDecl.id,
    ];
}
//# sourceMappingURL=externalReturnReceiver.js.map