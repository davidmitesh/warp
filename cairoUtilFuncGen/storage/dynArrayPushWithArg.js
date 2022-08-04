"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DynArrayPushWithArgGen = void 0;
const assert_1 = __importDefault(require("assert"));
const solc_typed_ast_1 = require("solc-typed-ast");
const cairoTypeSystem_1 = require("../../utils/cairoTypeSystem");
const functionGeneration_1 = require("../../utils/functionGeneration");
const utils_1 = require("../../utils/utils");
const base_1 = require("../base");
const nodeTypeProcessing_1 = require("../../utils/nodeTypeProcessing");
class DynArrayPushWithArgGen extends base_1.StringIndexedFuncGen {
    constructor(dynArrayGen, storageWrite, memoryToStorage, storageToStorage, calldataToStorage, calldataToStorageConversion, ast, sourceUnit) {
        super(ast, sourceUnit);
        this.dynArrayGen = dynArrayGen;
        this.storageWrite = storageWrite;
        this.memoryToStorage = memoryToStorage;
        this.storageToStorage = storageToStorage;
        this.calldataToStorage = calldataToStorage;
        this.calldataToStorageConversion = calldataToStorageConversion;
    }
    gen(push, nodeInSourceUnit) {
        (0, assert_1.default)(push.vExpression instanceof solc_typed_ast_1.MemberAccess);
        const arrayType = (0, solc_typed_ast_1.generalizeType)((0, solc_typed_ast_1.getNodeType)(push.vExpression.vExpression, this.ast.compilerVersion))[0];
        (0, assert_1.default)(arrayType instanceof solc_typed_ast_1.ArrayType ||
            arrayType instanceof solc_typed_ast_1.BytesType ||
            arrayType instanceof solc_typed_ast_1.StringType);
        (0, assert_1.default)(push.vArguments.length > 0, `Attempted to treat push without argument as push with argument`);
        const [argType, argLoc] = (0, solc_typed_ast_1.generalizeType)((0, solc_typed_ast_1.getNodeType)(push.vArguments[0], this.ast.compilerVersion));
        const name = this.getOrCreate((0, nodeTypeProcessing_1.getElementType)(arrayType), argType, argLoc ?? solc_typed_ast_1.DataLocation.Default);
        const implicits = argLoc === solc_typed_ast_1.DataLocation.Memory
            ? ['syscall_ptr', 'pedersen_ptr', 'range_check_ptr', 'warp_memory']
            : ['syscall_ptr', 'pedersen_ptr', 'range_check_ptr', 'bitwise_ptr'];
        const functionStub = (0, functionGeneration_1.createCairoFunctionStub)(name, [
            ['loc', (0, utils_1.typeNameFromTypeNode)(arrayType, this.ast), solc_typed_ast_1.DataLocation.Storage],
            ['value', (0, utils_1.typeNameFromTypeNode)(argType, this.ast), argLoc ?? solc_typed_ast_1.DataLocation.Default],
        ], [], implicits, this.ast, nodeInSourceUnit ?? push);
        return (0, functionGeneration_1.createCallToFunction)(functionStub, [push.vExpression.vExpression, push.vArguments[0]], this.ast);
    }
    getOrCreate(elementType, argType, argLoc) {
        const key = `${elementType.pp()}->${argType.pp()}`;
        const existing = this.generatedFunctions.get(key);
        if (existing !== undefined) {
            return existing.name;
        }
        let elementWriteFunc;
        let inputType;
        if (argLoc === solc_typed_ast_1.DataLocation.Memory) {
            elementWriteFunc = this.memoryToStorage.getOrCreate(elementType);
            inputType = 'felt';
        }
        else if (argLoc === solc_typed_ast_1.DataLocation.Storage) {
            elementWriteFunc = this.storageToStorage.getOrCreate(elementType, argType);
            inputType = 'felt';
        }
        else if (argLoc === solc_typed_ast_1.DataLocation.CallData) {
            if (elementType.pp() !== argType.pp()) {
                elementWriteFunc = this.calldataToStorageConversion.getOrCreate((0, nodeTypeProcessing_1.specializeType)(elementType, solc_typed_ast_1.DataLocation.Storage), (0, nodeTypeProcessing_1.specializeType)(argType, solc_typed_ast_1.DataLocation.CallData));
            }
            else {
                elementWriteFunc = this.calldataToStorage.getOrCreate(elementType);
            }
            inputType = cairoTypeSystem_1.CairoType.fromSol(argType, this.ast, cairoTypeSystem_1.TypeConversionContext.CallDataRef).toString();
        }
        else {
            elementWriteFunc = this.storageWrite.getOrCreate(elementType);
            inputType = cairoTypeSystem_1.CairoType.fromSol(elementType, this.ast).toString();
        }
        const allocationCairoType = cairoTypeSystem_1.CairoType.fromSol(elementType, this.ast, cairoTypeSystem_1.TypeConversionContext.StorageAllocation);
        const [arrayName, lengthName] = this.dynArrayGen.gen(allocationCairoType);
        const funcName = `${arrayName}_PUSHV${this.generatedFunctions.size}`;
        const implicits = argLoc === solc_typed_ast_1.DataLocation.Memory
            ? '{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr : felt, warp_memory: DictAccess*}'
            : '{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr : felt, bitwise_ptr: BitwiseBuiltin*}';
        const callWriteFunc = (cairoVar) => (0, nodeTypeProcessing_1.isDynamicArray)(argType) || argType instanceof solc_typed_ast_1.MappingType
            ? [`let (elem_id) = readId(${cairoVar})`, `${elementWriteFunc}(elem_id, value)`]
            : [`${elementWriteFunc}(${cairoVar}, value)`];
        this.generatedFunctions.set(key, {
            name: funcName,
            code: [
                `func ${funcName}${implicits}(loc: felt, value: ${inputType}) -> ():`,
                `    alloc_locals`,
                `    let (len) = ${lengthName}.read(loc)`,
                `    let (newLen, carry) = uint256_add(len, Uint256(1,0))`,
                `    assert carry = 0`,
                `    ${lengthName}.write(loc, newLen)`,
                `    let (existing) = ${arrayName}.read(loc, len)`,
                `    if (existing) == 0:`,
                `        let (used) = WARP_USED_STORAGE.read()`,
                `        WARP_USED_STORAGE.write(used + ${allocationCairoType.width})`,
                `        ${arrayName}.write(loc, len, used)`,
                ...callWriteFunc('used'),
                `    else:`,
                ...callWriteFunc('existing'),
                `    end`,
                `    return ()`,
                `end`,
            ].join('\n'),
        });
        this.requireImport('starkware.cairo.common.uint256', 'Uint256');
        this.requireImport('starkware.cairo.common.uint256', 'uint256_add');
        return funcName;
    }
}
exports.DynArrayPushWithArgGen = DynArrayPushWithArgGen;
//# sourceMappingURL=dynArrayPushWithArg.js.map