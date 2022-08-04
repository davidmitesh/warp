"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeStructTree = exports.reorderStructs = exports.OrderNestedStructs = void 0;
const solc_typed_ast_1 = require("solc-typed-ast");
const mapper_1 = require("../ast/mapper");
class OrderNestedStructs extends mapper_1.ASTMapper {
    // Cairo does not permit to use struct definitions which are yet to be defined.
    // For example:
    // contract Warp {
    //    struct Top {
    //        Nested n;
    //    }
    //    struct Nested { ... }
    // }
    // When transpiled to Cairo, struct definitions must be reordered so that
    // nested structs are defined first:
    //   struct Nested { ... }
    //   struct Top {
    //     member n : Nested;
    //   }
    // Function to add passes that should have been run before this pass
    addInitialPassPrerequisites() {
        const passKeys = new Set([]);
        passKeys.forEach((key) => this.addPassPrerequisite(key));
    }
    visitSourceUnit(node, ast) {
        this.reorderNestedStructs(node, ast);
        this.commonVisit(node, ast);
    }
    visitContractDefinition(node, ast) {
        this.reorderNestedStructs(node, ast);
    }
    reorderNestedStructs(node, ast) {
        const structs = node.vStructs;
        const [roots, tree] = makeStructTree(new Set(structs), ast);
        // there are no nested structs
        if (roots.size === structs.length)
            return;
        const newStructOrder = reorderStructs(roots, tree);
        // remove old struct definiton
        structs.forEach((child) => {
            if (child instanceof solc_typed_ast_1.StructDefinition) {
                node.removeChild(child);
            }
        });
        // insert back in new order
        newStructOrder.reverse().forEach((struct) => node.insertAtBeginning(struct));
    }
}
exports.OrderNestedStructs = OrderNestedStructs;
function reorderStructs(roots, tree) {
    const newOrder = [];
    const visited = new Set();
    roots.forEach((root) => visitTree(root, tree, visited, newOrder));
    return newOrder;
}
exports.reorderStructs = reorderStructs;
// dfs through the tree
// root is alawys added to orderedStructs after all it's children
function visitTree(root, tree, visited, orderedStructs) {
    if (visited.has(root)) {
        return;
    }
    visited.add(root);
    tree.get(root)?.forEach((nested) => visitTree(nested, tree, visited, orderedStructs));
    orderedStructs.push(root);
}
function makeStructTree(structs, ast) {
    const roots = new Set(structs);
    const tree = new Map();
    structs.forEach((struct) => {
        struct.vMembers.forEach((varDecl) => {
            const nestedStruct = findStruct((0, solc_typed_ast_1.getNodeType)(varDecl, ast.compilerVersion));
            // second check to avoid adding imported structs to contract defintion
            if (nestedStruct !== null && structs.has(nestedStruct)) {
                roots.delete(nestedStruct);
                tree.has(struct) ? tree.get(struct)?.push(nestedStruct) : tree.set(struct, [nestedStruct]);
            }
        });
    });
    // roots are struct definition from which none other struct defintion
    // depends on
    return [roots, tree];
}
exports.makeStructTree = makeStructTree;
function findStruct(varType) {
    if (varType instanceof solc_typed_ast_1.UserDefinedType && varType.definition instanceof solc_typed_ast_1.StructDefinition)
        return varType.definition;
    if (varType instanceof solc_typed_ast_1.ArrayType && varType.size !== undefined)
        return findStruct(varType.elementT);
    return null;
}
//# sourceMappingURL=orderNestedStructs.js.map