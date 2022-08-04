"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeleteHandler = void 0;
const solc_typed_ast_1 = require("solc-typed-ast");
const mapper_1 = require("../ast/mapper");
const cloning_1 = require("../utils/cloning");
const defaultValueNodes_1 = require("../utils/defaultValueNodes");
class DeleteHandler extends mapper_1.ASTMapper {
    // Function to add passes that should have been run before this pass
    addInitialPassPrerequisites() {
        const passKeys = new Set([]);
        passKeys.forEach((key) => this.addPassPrerequisite(key));
    }
    visitUnaryOperation(node, ast) {
        if (node.operator !== 'delete') {
            return this.commonVisit(node, ast);
        }
        const nodeType = (0, solc_typed_ast_1.getNodeType)(node.vSubExpression, ast.compilerVersion);
        // Deletetion from storage is handled in References
        if ((nodeType instanceof solc_typed_ast_1.PointerType && nodeType.location === solc_typed_ast_1.DataLocation.Storage) ||
            (node instanceof solc_typed_ast_1.Identifier &&
                node.vReferencedDeclaration instanceof solc_typed_ast_1.VariableDeclaration &&
                node.vReferencedDeclaration.stateVariable)) {
            return;
        }
        const newNode = (0, defaultValueNodes_1.getDefaultValue)(nodeType, node, ast);
        ast.replaceNode(node, new solc_typed_ast_1.Assignment(ast.reserveId(), node.src, nodeType.pp(), '=', node.vSubExpression, newNode, node.raw));
    }
    visitReturn(node, ast) {
        let visited = false;
        if (node.vExpression) {
            const nodeType = (0, solc_typed_ast_1.getNodeType)(node.vExpression, ast.compilerVersion);
            if (nodeType instanceof solc_typed_ast_1.TupleType && nodeType.getChildren().length === 0) {
                const statement = new solc_typed_ast_1.ExpressionStatement(ast.reserveId(), node.src, node.vExpression, (0, cloning_1.cloneDocumentation)(node.documentation, ast, new Map()), node.raw);
                ast.insertStatementBefore(node, statement);
                node.vExpression = undefined;
                this.commonVisit(statement, ast);
                visited = true;
            }
        }
        if (!visited)
            this.commonVisit(node, ast);
    }
}
exports.DeleteHandler = DeleteHandler;
//# sourceMappingURL=deleteHandler.js.map