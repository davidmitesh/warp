"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CairoUtilImporter = void 0;
const solc_typed_ast_1 = require("solc-typed-ast");
const mapper_1 = require("../ast/mapper");
const utils_1 = require("../utils/utils");
/*
  Analyses the tree after all processing has been done to find code the relies on
  cairo imports that are not easy to add elsewhere. For example it's easy to import
  the warplib maths functions as they are added to the code, but for determining if
  Uint256 needs to be imported, it's easier to do it here
*/
class CairoUtilImporter extends mapper_1.ASTMapper {
    // Function to add passes that should have been run before this pass
    addInitialPassPrerequisites() {
        const passKeys = new Set([]);
        passKeys.forEach((key) => this.addPassPrerequisite(key));
    }
    visitElementaryTypeName(node, ast) {
        if ((0, utils_1.primitiveTypeToCairo)(node.name) === 'Uint256') {
            ast.registerImport(node, 'starkware.cairo.common.uint256', 'Uint256');
        }
    }
    visitLiteral(node, ast) {
        const type = (0, solc_typed_ast_1.getNodeType)(node, ast.compilerVersion);
        if (type instanceof solc_typed_ast_1.IntType && type.nBits > 251) {
            ast.registerImport(node, 'starkware.cairo.common.uint256', 'Uint256');
        }
    }
    visitCairoFunctionDefinition(node, ast) {
        if (node.implicits.has('warp_memory') && (0, utils_1.isExternallyVisible)(node)) {
            ast.registerImport(node, 'starkware.cairo.common.default_dict', 'default_dict_new');
            ast.registerImport(node, 'starkware.cairo.common.default_dict', 'default_dict_finalize');
            ast.registerImport(node, 'starkware.cairo.common.dict', 'dict_write');
        }
        if (node.implicits.has('keccak_ptr') && (0, utils_1.isExternallyVisible)(node)) {
            ast.registerImport(node, 'starkware.cairo.common.cairo_keccak.keccak', 'finalize_keccak');
            // Required to create a keccak_ptr
            ast.registerImport(node, 'starkware.cairo.common.alloc', 'alloc');
        }
        this.commonVisit(node, ast);
    }
}
exports.CairoUtilImporter = CairoUtilImporter;
//# sourceMappingURL=cairoUtilImporter.js.map