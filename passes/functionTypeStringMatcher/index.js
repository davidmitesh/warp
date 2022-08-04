"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FunctionTypeStringMatcher = void 0;
const mapper_1 = require("../../ast/mapper");
const functionDefinitionTypestringMatcher_1 = require("./functionDefinitionTypestringMatcher");
const identifierTypeStringMatcher_1 = require("./identifierTypeStringMatcher");
class FunctionTypeStringMatcher extends mapper_1.ASTMapper {
    // Function to add passes that should have been run before this pass
    addInitialPassPrerequisites() {
        const passKeys = new Set([]);
        passKeys.forEach((key) => this.addPassPrerequisite(key));
    }
    static map(ast) {
        const declarations = new Map();
        ast.roots.forEach((root) => {
            new functionDefinitionTypestringMatcher_1.FunctionDefinitionMatcher(declarations).dispatchVisit(root, ast);
        });
        ast.roots.forEach((root) => {
            new identifierTypeStringMatcher_1.IdentifierTypeStringMatcher(declarations).dispatchVisit(root, ast);
        });
        return ast;
    }
}
exports.FunctionTypeStringMatcher = FunctionTypeStringMatcher;
//# sourceMappingURL=index.js.map