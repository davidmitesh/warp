"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FunctionDefinitionMatcher = void 0;
const mapper_1 = require("../../ast/mapper");
const solc_typed_ast_1 = require("solc-typed-ast");
class FunctionDefinitionMatcher extends mapper_1.ASTMapper {
    constructor(declarations) {
        super();
        this.declarations = declarations;
    }
    visitFunctionCall(node, ast) {
        const functionNodeType = (0, solc_typed_ast_1.getNodeType)(node.vExpression, ast.compilerVersion);
        if (node.vArguments.length === 0 ||
            node.kind === solc_typed_ast_1.FunctionCallKind.TypeConversion ||
            node.vFunctionCallType === solc_typed_ast_1.ExternalReferenceType.Builtin ||
            !(node.vReferencedDeclaration instanceof solc_typed_ast_1.FunctionDefinition) ||
            !(functionNodeType instanceof solc_typed_ast_1.FunctionType)) {
            this.commonVisit(node, ast);
            return;
        }
        const parameterTypes = functionNodeType.parameters;
        const returnsTypes = functionNodeType.returns;
        node.vReferencedDeclaration.vParameters.vParameters.forEach((parameter, index) => {
            // Solc 0.7.0 types push and pop as you would expect, 0.8.0 adds an extra initial argument
            // console.log(parameter.id);
            const paramIndex = index + parameterTypes.length - node.vArguments.length;
            const t = parameterTypes[paramIndex];
            if (t instanceof solc_typed_ast_1.PointerType) {
                if (parameter.storageLocation !== t.location) {
                    parameter.storageLocation = t.location;
                    this.declarations.set(parameter, true);
                }
            }
        });
        node.vReferencedDeclaration.vReturnParameters.vParameters.forEach((parameter, index) => {
            const t = returnsTypes[index];
            if (t instanceof solc_typed_ast_1.PointerType) {
                if (parameter.storageLocation !== t.location) {
                    parameter.storageLocation = t.location;
                    this.declarations.set(parameter, true);
                }
            }
        });
        this.commonVisit(node, ast);
    }
}
exports.FunctionDefinitionMatcher = FunctionDefinitionMatcher;
//# sourceMappingURL=functionDefinitionTypestringMatcher.js.map