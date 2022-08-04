"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryDynArrayLengthGen = void 0;
const solc_typed_ast_1 = require("solc-typed-ast");
const functionGeneration_1 = require("../../utils/functionGeneration");
const nodeTemplates_1 = require("../../utils/nodeTemplates");
const utils_1 = require("../../utils/utils");
const base_1 = require("../base");
class MemoryDynArrayLengthGen extends base_1.CairoUtilFuncGenBase {
    getGeneratedCode() {
        return '';
    }
    gen(node, ast) {
        const arrayType = (0, solc_typed_ast_1.generalizeType)((0, solc_typed_ast_1.getNodeType)(node.vExpression, ast.compilerVersion))[0];
        const arrayTypeName = (0, utils_1.typeNameFromTypeNode)(arrayType, ast);
        const functionStub = (0, functionGeneration_1.createCairoFunctionStub)('wm_dyn_array_length', [['arrayLoc', arrayTypeName, solc_typed_ast_1.DataLocation.Memory]], [['len', (0, nodeTemplates_1.createUint256TypeName)(this.ast)]], ['warp_memory'], this.ast, node);
        const call = (0, functionGeneration_1.createCallToFunction)(functionStub, [node.vExpression], this.ast);
        this.ast.registerImport(call, 'warplib.memory', 'wm_dyn_array_length');
        return call;
    }
}
exports.MemoryDynArrayLengthGen = MemoryDynArrayLengthGen;
//# sourceMappingURL=memoryDynArrayLength.js.map