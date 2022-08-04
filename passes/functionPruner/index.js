"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnreachableFunctionPruner = void 0;
const mapper_1 = require("../../ast/mapper");
const callGraph_1 = require("./callGraph");
const functionRemover_1 = require("./functionRemover");
class UnreachableFunctionPruner extends mapper_1.ASTMapper {
    // Function to add passes that should have been run before this pass
    addInitialPassPrerequisites() {
        const passKeys = new Set([]);
        passKeys.forEach((key) => this.addPassPrerequisite(key));
    }
    static map(ast) {
        ast.roots.forEach((root) => {
            const graph = new callGraph_1.CallGraphBuilder();
            graph.dispatchVisit(root, ast);
            new functionRemover_1.FunctionRemover(graph.getFunctionGraph()).dispatchVisit(root, ast);
        });
        return ast;
    }
}
exports.UnreachableFunctionPruner = UnreachableFunctionPruner;
//# sourceMappingURL=index.js.map