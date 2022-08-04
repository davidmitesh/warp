"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DynArrayLengthGen = void 0;
const solc_typed_ast_1 = require("solc-typed-ast");
const cairoTypeSystem_1 = require("../../utils/cairoTypeSystem");
const functionGeneration_1 = require("../../utils/functionGeneration");
const nodeTemplates_1 = require("../../utils/nodeTemplates");
const nodeTypeProcessing_1 = require("../../utils/nodeTypeProcessing");
const utils_1 = require("../../utils/utils");
const base_1 = require("../base");
class DynArrayLengthGen extends base_1.CairoUtilFuncGenBase {
    constructor(dynArrayGen, ast, sourceUnit) {
        super(ast, sourceUnit);
        this.dynArrayGen = dynArrayGen;
    }
    getGeneratedCode() {
        return '';
    }
    gen(node, arrayType, nodeInSourceUnit) {
        const lengthName = this.dynArrayGen.gen(cairoTypeSystem_1.CairoType.fromSol((0, nodeTypeProcessing_1.getElementType)(arrayType), this.ast, cairoTypeSystem_1.TypeConversionContext.StorageAllocation))[1];
        const functionStub = (0, functionGeneration_1.createCairoFunctionStub)(`${lengthName}.read`, [['name', (0, utils_1.typeNameFromTypeNode)(arrayType, this.ast), solc_typed_ast_1.DataLocation.Storage]], [['len', (0, nodeTemplates_1.createUint256TypeName)(this.ast)]], ['syscall_ptr', 'pedersen_ptr', 'range_check_ptr'], this.ast, nodeInSourceUnit ?? node);
        return (0, functionGeneration_1.createCallToFunction)(functionStub, [node.vExpression], this.ast);
    }
}
exports.DynArrayLengthGen = DynArrayLengthGen;
//# sourceMappingURL=dynArrayLength.js.map