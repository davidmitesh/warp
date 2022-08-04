"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DynArrayIndexAccessGen = void 0;
const assert_1 = __importDefault(require("assert"));
const solc_typed_ast_1 = require("solc-typed-ast");
const cairoTypeSystem_1 = require("../../utils/cairoTypeSystem");
const functionGeneration_1 = require("../../utils/functionGeneration");
const nodeTemplates_1 = require("../../utils/nodeTemplates");
const nodeTypeProcessing_1 = require("../../utils/nodeTypeProcessing");
const utils_1 = require("../../utils/utils");
const base_1 = require("../base");
class DynArrayIndexAccessGen extends base_1.StringIndexedFuncGen {
    constructor(dynArrayGen, ast, sourceUnit) {
        super(ast, sourceUnit);
        this.dynArrayGen = dynArrayGen;
    }
    gen(node, nodeInSourceUnit) {
        const base = node.vBaseExpression;
        const index = node.vIndexExpression;
        (0, assert_1.default)(index !== undefined);
        const nodeType = (0, solc_typed_ast_1.getNodeType)(node, this.ast.compilerVersion);
        const baseType = (0, solc_typed_ast_1.getNodeType)(base, this.ast.compilerVersion);
        (0, assert_1.default)(baseType instanceof solc_typed_ast_1.PointerType && (0, nodeTypeProcessing_1.isDynamicArray)(baseType.to));
        const name = this.getOrCreate(nodeType);
        const functionStub = (0, functionGeneration_1.createCairoFunctionStub)(name, [
            ['loc', (0, utils_1.typeNameFromTypeNode)(baseType, this.ast), solc_typed_ast_1.DataLocation.Storage],
            ['offset', (0, nodeTemplates_1.createUint256TypeName)(this.ast)],
        ], [['resLoc', (0, utils_1.typeNameFromTypeNode)(nodeType, this.ast), solc_typed_ast_1.DataLocation.Storage]], ['syscall_ptr', 'pedersen_ptr', 'range_check_ptr'], this.ast, nodeInSourceUnit ?? node);
        return (0, functionGeneration_1.createCallToFunction)(functionStub, [base, index], this.ast);
    }
    getOrCreate(valueType) {
        const valueCairoType = cairoTypeSystem_1.CairoType.fromSol(valueType, this.ast, cairoTypeSystem_1.TypeConversionContext.StorageAllocation);
        const key = valueCairoType.fullStringRepresentation;
        const existing = this.generatedFunctions.get(key);
        if (existing !== undefined) {
            return existing.name;
        }
        const [arrayName, lengthName] = this.dynArrayGen.gen(valueCairoType);
        const funcName = `${arrayName}_IDX`;
        this.generatedFunctions.set(key, {
            name: funcName,
            code: [
                `func ${funcName}{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr : felt}(ref: felt, index: Uint256) -> (res: felt):`,
                `    alloc_locals`,
                `    let (length) = ${lengthName}.read(ref)`,
                `    let (inRange) = uint256_lt(index, length)`,
                `    assert inRange = 1`,
                `    let (existing) = ${arrayName}.read(ref, index)`,
                `    if existing == 0:`,
                `        let (used) = WARP_USED_STORAGE.read()`,
                `        WARP_USED_STORAGE.write(used + ${valueCairoType.width})`,
                `        ${arrayName}.write(ref, index, used)`,
                `        return (used)`,
                `    else:`,
                `        return (existing)`,
                `    end`,
                `end`,
            ].join('\n'),
        });
        this.requireImport('starkware.cairo.common.uint256', 'Uint256');
        this.requireImport('starkware.cairo.common.uint256', 'uint256_lt');
        return funcName;
    }
}
exports.DynArrayIndexAccessGen = DynArrayIndexAccessGen;
//# sourceMappingURL=dynArrayIndexAccess.js.map