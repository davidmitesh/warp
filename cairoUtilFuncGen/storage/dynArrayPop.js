"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DynArrayPopGen = void 0;
const assert_1 = __importDefault(require("assert"));
const solc_typed_ast_1 = require("solc-typed-ast");
const cairoTypeSystem_1 = require("../../utils/cairoTypeSystem");
const functionGeneration_1 = require("../../utils/functionGeneration");
const nodeTypeProcessing_1 = require("../../utils/nodeTypeProcessing");
const utils_1 = require("../../utils/utils");
const base_1 = require("../base");
class DynArrayPopGen extends base_1.StringIndexedFuncGen {
    constructor(dynArrayGen, storageDelete, ast, sourceUnit) {
        super(ast, sourceUnit);
        this.dynArrayGen = dynArrayGen;
        this.storageDelete = storageDelete;
    }
    gen(pop, nodeInSourceUnit) {
        (0, assert_1.default)(pop.vExpression instanceof solc_typed_ast_1.MemberAccess);
        const arrayType = (0, solc_typed_ast_1.generalizeType)((0, solc_typed_ast_1.getNodeType)(pop.vExpression.vExpression, this.ast.compilerVersion))[0];
        (0, assert_1.default)(arrayType instanceof solc_typed_ast_1.ArrayType ||
            arrayType instanceof solc_typed_ast_1.BytesType ||
            arrayType instanceof solc_typed_ast_1.StringType);
        const name = this.getOrCreate((0, nodeTypeProcessing_1.getElementType)(arrayType));
        const functionStub = (0, functionGeneration_1.createCairoFunctionStub)(name, [['loc', (0, utils_1.typeNameFromTypeNode)(arrayType, this.ast), solc_typed_ast_1.DataLocation.Storage]], [], ['syscall_ptr', 'pedersen_ptr', 'range_check_ptr'], this.ast, nodeInSourceUnit ?? pop);
        return (0, functionGeneration_1.createCallToFunction)(functionStub, [pop.vExpression.vExpression], this.ast);
    }
    getOrCreate(elementType) {
        const cairoElementType = cairoTypeSystem_1.CairoType.fromSol(elementType, this.ast, cairoTypeSystem_1.TypeConversionContext.StorageAllocation);
        const key = cairoElementType.fullStringRepresentation;
        const existing = this.generatedFunctions.get(key);
        if (existing !== undefined) {
            return existing.name;
        }
        const [arrayName, lengthName] = this.dynArrayGen.gen(cairoElementType);
        const deleteFuncName = this.storageDelete.genFuncName(elementType);
        const getElemLoc = (0, nodeTypeProcessing_1.isDynamicArray)(elementType) || (0, nodeTypeProcessing_1.isMapping)(elementType)
            ? [
                `let (elem_loc) = ${arrayName}.read(loc, newLen)`,
                `let (elem_loc) = readId(elem_loc)`,
            ].join('\n')
            : `let (elem_loc) = ${arrayName}.read(loc, newLen)`;
        const funcName = `${arrayName}_POP`;
        this.generatedFunctions.set(key, {
            name: funcName,
            code: [
                `func ${funcName}{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr : felt}(loc: felt) -> ():`,
                `    alloc_locals`,
                `    let (len) = ${lengthName}.read(loc)`,
                `    let (isEmpty) = uint256_eq(len, Uint256(0,0))`,
                `    assert isEmpty = 0`,
                `    let (newLen) = uint256_sub(len, Uint256(1,0))`,
                `    ${lengthName}.write(loc, newLen)`,
                `    ${getElemLoc}`,
                `    return ${deleteFuncName}(elem_loc)`,
                `end`,
            ].join('\n'),
        });
        this.requireImport('starkware.cairo.common.uint256', 'Uint256');
        this.requireImport('starkware.cairo.common.uint256', 'uint256_eq');
        this.requireImport('starkware.cairo.common.uint256', 'uint256_sub');
        return funcName;
    }
}
exports.DynArrayPopGen = DynArrayPopGen;
//# sourceMappingURL=dynArrayPop.js.map