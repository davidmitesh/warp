"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TypeStringsChecker = void 0;
const assert_1 = __importDefault(require("assert"));
const solc_typed_ast_1 = require("solc-typed-ast");
const mapper_1 = require("../ast/mapper");
class AssertTypeStrings extends mapper_1.ASTMapper {
    visitTypeName(node, ast) {
        this.commonVisit(node, ast);
        (0, assert_1.default)(node.typeString !== undefined, 'Undefined typestring found for TypeName');
    }
}
class TypeStringsChecker extends mapper_1.ASTMapper {
    // Function to add passes that should have been run before this pass
    addInitialPassPrerequisites() {
        const passKeys = new Set([]);
        passKeys.forEach((key) => this.addPassPrerequisite(key));
    }
    visitElementaryTypeName(node, _ast) {
        if (node.typeString === undefined) {
            node.typeString = (0, solc_typed_ast_1.typeNameToTypeNode)(node).pp();
        }
    }
    static map(ast) {
        ast.roots.forEach((root) => {
            const mapper = new this();
            mapper.dispatchVisit(root, ast);
        });
        ast.roots.forEach((root) => {
            const mapper = new AssertTypeStrings();
            mapper.dispatchVisit(root, ast);
        });
        return ast;
    }
}
exports.TypeStringsChecker = TypeStringsChecker;
//# sourceMappingURL=typeStringsChecker.js.map