"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FunctionRemover = void 0;
const assert_1 = __importDefault(require("assert"));
const mapper_1 = require("../../ast/mapper");
const astPrinter_1 = require("../../utils/astPrinter");
const utils_1 = require("../../utils/utils");
class FunctionRemover extends mapper_1.ASTMapper {
    constructor(graph) {
        super();
        this.functionGraph = graph;
    }
    visitContractDefinition(node, _ast) {
        const reachableFunctions = new Set();
        // Collect visible functions and obtain ids of all reachable functions
        node.vFunctions
            .filter((func) => (0, utils_1.isExternallyVisible)(func))
            .forEach((func) => this.dfs(func, reachableFunctions));
        // Remove unreachable functions
        node.vFunctions
            .filter((func) => !reachableFunctions.has(func.id))
            .forEach((func) => node.removeChild(func));
    }
    dfs(f, visited) {
        visited.add(f.id);
        const functions = this.functionGraph.get(f.id);
        (0, assert_1.default)(functions !== undefined, `Function ${(0, astPrinter_1.printNode)(f)} was not added to the functionGraph`);
        functions.forEach((f) => {
            if (!visited.has(f.id))
                this.dfs(f, visited);
        });
    }
}
exports.FunctionRemover = FunctionRemover;
//# sourceMappingURL=functionRemover.js.map