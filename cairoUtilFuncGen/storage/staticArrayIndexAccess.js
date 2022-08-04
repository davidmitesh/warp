"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageStaticArrayIndexAccessGen = void 0;
const assert_1 = __importDefault(require("assert"));
const solc_typed_ast_1 = require("solc-typed-ast");
const cairoTypeSystem_1 = require("../../utils/cairoTypeSystem");
const functionGeneration_1 = require("../../utils/functionGeneration");
const nodeTemplates_1 = require("../../utils/nodeTemplates");
const utils_1 = require("../../utils/utils");
const base_1 = require("../base");
class StorageStaticArrayIndexAccessGen extends base_1.CairoUtilFuncGenBase {
    constructor() {
        super(...arguments);
        this.generatedFunction = null;
    }
    getGeneratedCode() {
        return this.generatedFunction ?? '';
    }
    gen(node, nodeInSourceUnit) {
        (0, assert_1.default)(node.vIndexExpression !== undefined);
        const name = this.getOrCreate();
        const arrayType = (0, solc_typed_ast_1.getNodeType)(node.vBaseExpression, this.ast.compilerVersion);
        (0, assert_1.default)(arrayType instanceof solc_typed_ast_1.PointerType &&
            arrayType.to instanceof solc_typed_ast_1.ArrayType &&
            arrayType.to.size !== undefined);
        const valueType = (0, solc_typed_ast_1.getNodeType)(node, this.ast.compilerVersion);
        const functionStub = (0, functionGeneration_1.createCairoFunctionStub)(name, [
            ['loc', (0, utils_1.typeNameFromTypeNode)(arrayType, this.ast), solc_typed_ast_1.DataLocation.Storage],
            ['index', (0, nodeTemplates_1.createUint256TypeName)(this.ast)],
            ['size', (0, nodeTemplates_1.createUint256TypeName)(this.ast)],
            ['limit', (0, nodeTemplates_1.createUint256TypeName)(this.ast)],
        ], [['resLoc', (0, utils_1.typeNameFromTypeNode)(valueType, this.ast), solc_typed_ast_1.DataLocation.Storage]], ['range_check_ptr'], this.ast, nodeInSourceUnit ?? node);
        return (0, functionGeneration_1.createCallToFunction)(functionStub, [
            node.vBaseExpression,
            node.vIndexExpression,
            (0, nodeTemplates_1.createNumberLiteral)(cairoTypeSystem_1.CairoType.fromSol(valueType, this.ast, cairoTypeSystem_1.TypeConversionContext.StorageAllocation).width, this.ast, 'uint256'),
            (0, nodeTemplates_1.createNumberLiteral)(arrayType.to.size, this.ast, 'uint256'),
        ], this.ast);
    }
    getOrCreate() {
        if (this.generatedFunction === null) {
            this.generatedFunction = idxCode;
            this.requireImport('starkware.cairo.common.math', 'split_felt');
            this.requireImport('starkware.cairo.common.uint256', 'uint256_add');
            this.requireImport('starkware.cairo.common.uint256', 'uint256_le');
            this.requireImport('starkware.cairo.common.uint256', 'uint256_lt');
            this.requireImport('starkware.cairo.common.uint256', 'uint256_mul');
        }
        return 'WS0_IDX';
    }
}
exports.StorageStaticArrayIndexAccessGen = StorageStaticArrayIndexAccessGen;
const idxCode = [
    `func WS0_IDX{range_check_ptr}(loc: felt, index: Uint256, size: Uint256, limit: Uint256) -> (resLoc: felt):`,
    `    alloc_locals`,
    `    let (inRange) = uint256_lt(index, limit)`,
    `    assert inRange = 1`,
    `    let (locHigh, locLow) = split_felt(loc)`,
    `    let (offset, overflow) = uint256_mul(index, size)`,
    `    assert overflow.low = 0`,
    `    assert overflow.high = 0`,
    `    let (res256, carry) = uint256_add(Uint256(locLow, locHigh), offset)`,
    `    assert carry = 0`,
    `    let (feltLimitHigh, feltLimitLow) = split_felt(-1)`,
    `    let (narrowable) = uint256_le(res256, Uint256(feltLimitLow, feltLimitHigh))`,
    `    assert narrowable = 1`,
    `    return (res256.low + 2**128 * res256.high)`,
    `end`,
].join('\n');
//# sourceMappingURL=staticArrayIndexAccess.js.map