"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IdentifierTypeStringMatcher = void 0;
const mapper_1 = require("../../ast/mapper");
const solc_typed_ast_1 = require("solc-typed-ast");
class IdentifierTypeStringMatcher extends mapper_1.ASTMapper {
    constructor(declarations) {
        super();
        this.declarations = declarations;
    }
    visitIdentifier(node, _ast) {
        if (node.vReferencedDeclaration instanceof solc_typed_ast_1.VariableDeclaration &&
            this.declarations.has(node.vReferencedDeclaration)) {
            const typeString = node.vReferencedDeclaration.typeString;
            if (node.vReferencedDeclaration.storageLocation !== solc_typed_ast_1.DataLocation.Default) {
                node.typeString = `${typeString} ${node.vReferencedDeclaration.storageLocation}`;
            }
        }
    }
}
exports.IdentifierTypeStringMatcher = IdentifierTypeStringMatcher;
//# sourceMappingURL=identifierTypeStringMatcher.js.map