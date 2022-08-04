"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStructsAndRemappings = void 0;
const solc_typed_ast_1 = require("solc-typed-ast");
const orderNestedStructs_1 = require("./passes/orderNestedStructs");
/*
  Library calls in solidity are delegate calls
  i.e  libraries can be seen as implicit base contracts of the contracts that use them
  The ReferencedLibraries pass converts external call to the library to internal call
  to it.
  This pass is called before the ReferncedLibraries pass to inline free functions
  into the contract if the free functions make library calls or if they call other free
  function which do that.
*/
function getStructsAndRemappings(node, ast) {
    // Stores old FunctionDefinition and cloned FunctionDefinition
    const remappings = new Map();
    const externalStructs = getDefinitionsToInline(node, node, new Set());
    return [(0, orderNestedStructs_1.reorderStructs)(...(0, orderNestedStructs_1.makeStructTree)(externalStructs, ast)), remappings];
}
exports.getStructsAndRemappings = getStructsAndRemappings;
// DFS a node for definitions in a free context.
function getDefinitionsToInline(scope, node, visited) {
    [...getStructDefinitionsInChildren(scope, node)].forEach((declaration) => {
        if (visited.has(declaration))
            return;
        visited.add(declaration);
        getDefinitionsToInline(scope, declaration, visited);
    });
    return visited;
}
function getStructDefinitionsInChildren(scope, node) {
    return new Set([
        ...node
            .getChildrenByType(solc_typed_ast_1.Identifier)
            .map((id) => id.vReferencedDeclaration)
            .filter((dec) => isExternal(scope, dec)),
        ...node
            .getChildrenByType(solc_typed_ast_1.UserDefinedTypeName)
            .map((tn) => tn.vReferencedDeclaration)
            .filter((dec) => isExternal(scope, dec)),
    ]);
}
function isExternal(scope, node) {
    return (node !== undefined &&
        node instanceof solc_typed_ast_1.StructDefinition &&
        node.getClosestParentByType(solc_typed_ast_1.SourceUnit) !== scope);
}
//# sourceMappingURL=freeStructWritter.js.map