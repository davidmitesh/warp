"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryToStorageGen = void 0;
const assert_1 = __importDefault(require("assert"));
const solc_typed_ast_1 = require("solc-typed-ast");
const astPrinter_1 = require("../../utils/astPrinter");
const cairoTypeSystem_1 = require("../../utils/cairoTypeSystem");
const errors_1 = require("../../utils/errors");
const functionGeneration_1 = require("../../utils/functionGeneration");
const nodeTypeProcessing_1 = require("../../utils/nodeTypeProcessing");
const utils_1 = require("../../utils/utils");
const utils_2 = require("../../warplib/utils");
const base_1 = require("../base");
/*
  Generates functions to copy data from warp_memory to WARP_STORAGE
  Specifically this has to deal with structs, static arrays, and dynamic arrays
  These require extra care because the representations are different in storage and memory
  In storage nested structures are stored in place, whereas in memory 'pointers' are used
*/
class MemoryToStorageGen extends base_1.StringIndexedFuncGen {
    constructor(dynArrayGen, storageDeleteGen, ast, sourceUnit) {
        super(ast, sourceUnit);
        this.dynArrayGen = dynArrayGen;
        this.storageDeleteGen = storageDeleteGen;
    }
    gen(storageLocation, memoryLocation, nodeInSourceUnit) {
        const type = (0, solc_typed_ast_1.generalizeType)((0, solc_typed_ast_1.getNodeType)(storageLocation, this.ast.compilerVersion))[0];
        const name = this.getOrCreate(type);
        const functionStub = (0, functionGeneration_1.createCairoFunctionStub)(name, [
            ['loc', (0, utils_1.typeNameFromTypeNode)(type, this.ast), solc_typed_ast_1.DataLocation.Storage],
            ['mem_loc', (0, utils_1.typeNameFromTypeNode)(type, this.ast), solc_typed_ast_1.DataLocation.Memory],
        ], [['loc', (0, utils_1.typeNameFromTypeNode)(type, this.ast), solc_typed_ast_1.DataLocation.Storage]], ['syscall_ptr', 'pedersen_ptr', 'range_check_ptr', 'warp_memory'], this.ast, nodeInSourceUnit ?? storageLocation, { mutability: solc_typed_ast_1.FunctionStateMutability.View });
        return (0, functionGeneration_1.createCallToFunction)(functionStub, [storageLocation, memoryLocation], this.ast);
    }
    getOrCreate(type) {
        const key = type.pp();
        const existing = this.generatedFunctions.get(key);
        if (existing !== undefined) {
            return existing.name;
        }
        const unexpectedTypeFunc = () => {
            throw new errors_1.NotSupportedYetError(`Copying ${(0, astPrinter_1.printTypeNode)(type)} from memory to storage not implemented yet`);
        };
        return (0, base_1.delegateBasedOnType)(type, (type) => this.createDynamicArrayCopyFunction(key, type), (type) => this.createStaticArrayCopyFunction(key, type), (type) => this.createStructCopyFunction(key, type), unexpectedTypeFunc, unexpectedTypeFunc);
    }
    // This can also be used for static arrays, in which case they are treated
    // like structs with <length> members of the same type
    createStructCopyFunction(key, type) {
        const funcName = `wm_to_storage${this.generatedFunctions.size}`;
        const implicits = '{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr : felt, warp_memory : DictAccess*}';
        // Set an empty entry so recursive function generation doesn't clash
        this.generatedFunctions.set(key, { name: funcName, code: '' });
        this.generatedFunctions.set(key, {
            name: funcName,
            code: [
                `func ${funcName}${implicits}(loc : felt, mem_loc: felt) -> (loc: felt):`,
                `    alloc_locals`,
                ...generateCopyInstructions(type, this.ast).flatMap(({ storageOffset, copyType }, index) => {
                    const elemLoc = `elem_mem_loc_${index}`;
                    if (copyType === undefined) {
                        return [
                            `let (${elemLoc}) = dict_read{dict_ptr=warp_memory}(${(0, base_1.add)('mem_loc', index)})`,
                            `WARP_STORAGE.write(${(0, base_1.add)('loc', storageOffset)}, ${elemLoc})`,
                        ];
                    }
                    else if ((0, nodeTypeProcessing_1.isDynamicArray)(copyType)) {
                        this.requireImport('warplib.memory', 'wm_read_id');
                        const funcName = this.getOrCreate(copyType);
                        return [
                            `let (${elemLoc}) = wm_read_id(${(0, base_1.add)('mem_loc', index)}, ${(0, utils_2.uint256)(2)})`,
                            `let (storage_dyn_array_loc) = readId(${(0, base_1.add)('loc', storageOffset)})`,
                            `${funcName}(storage_dyn_array_loc, ${elemLoc})`,
                        ];
                    }
                    else {
                        this.requireImport('warplib.memory', 'wm_read_id');
                        const funcName = this.getOrCreate(copyType);
                        const copyTypeWidth = cairoTypeSystem_1.CairoType.fromSol(copyType, this.ast, cairoTypeSystem_1.TypeConversionContext.Ref).width;
                        return [
                            `let (${elemLoc}) = wm_read_id(${(0, base_1.add)('mem_loc', index)}, ${(0, utils_2.uint256)(copyTypeWidth)})`,
                            `${funcName}(${(0, base_1.add)('loc', storageOffset)}, ${elemLoc})`,
                        ];
                    }
                }),
                `    return (loc)`,
                `end`,
            ].join('\n'),
        });
        this.requireImport('starkware.cairo.common.dict', 'dict_read');
        this.requireImport('starkware.cairo.common.uint256', 'Uint256');
        return funcName;
    }
    createStaticArrayCopyFunction(key, type) {
        (0, assert_1.default)(type.size !== undefined, 'Expected static array with known size');
        return type.size <= 5
            ? this.createStructCopyFunction(key, type)
            : this.createLargeStaticArrayCopyFunction(key, type);
    }
    createLargeStaticArrayCopyFunction(key, type) {
        (0, assert_1.default)(type.size !== undefined, 'Expected static array with known size');
        const length = (0, utils_1.narrowBigIntSafe)(type.size, `Failed to narrow size of ${(0, astPrinter_1.printTypeNode)(type)} in memory->storage copy generation`);
        const funcName = `wm_to_storage${this.generatedFunctions.size}`;
        this.generatedFunctions.set(key, { name: funcName, code: '' });
        const implicits = '{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr : felt, warp_memory : DictAccess*}';
        const elementStorageWidth = cairoTypeSystem_1.CairoType.fromSol(type.elementT, this.ast, cairoTypeSystem_1.TypeConversionContext.StorageAllocation).width;
        const elementMemoryWidth = cairoTypeSystem_1.CairoType.fromSol(type.elementT, this.ast).width;
        let copyCode;
        if ((0, nodeTypeProcessing_1.isDynamicArray)(type.elementT)) {
            copyCode = [
                `    let (storage_id) = readId(storage_loc)`,
                `    let (read) = wm_read_id(mem_loc, ${(0, utils_2.uint256)(2)})`,
                `    ${this.getOrCreate(type.elementT)}(storage_id, read)`,
            ].join('\n');
        }
        else if ((0, nodeTypeProcessing_1.isReferenceType)(type.elementT)) {
            copyCode = [
                `    let (read) = wm_read_id{dict_ptr=warp_memory}(mem_loc, ${(0, utils_2.uint256)(elementMemoryWidth)})`,
                `    ${this.getOrCreate(type.elementT)}(storage_loc, read)`,
            ].join('\n');
        }
        else {
            copyCode = (0, utils_1.mapRange)(elementStorageWidth, (n) => [
                `    let (copy) = dict_read{dict_ptr=warp_memory}(${(0, base_1.add)('mem_loc', n)})`,
                `    WARP_STORAGE.write(${(0, base_1.add)('storage_loc', n)}, copy)`,
            ].join('\n')).join('\n');
        }
        this.generatedFunctions.set(key, {
            name: funcName,
            code: [
                `func ${funcName}_elem${implicits}(storage_loc: felt, mem_loc : felt, length: felt) -> ():`,
                `    alloc_locals`,
                `    if length == 0:`,
                `        return ()`,
                `    end`,
                `    let index = length - 1`,
                copyCode,
                `    return ${funcName}_elem(${(0, base_1.add)('storage_loc', elementStorageWidth)}, ${(0, base_1.add)('mem_loc', elementMemoryWidth)}, index)`,
                `end`,
                `func ${funcName}${implicits}(loc : felt, mem_loc : felt) -> (loc : felt):`,
                `    alloc_locals`,
                `    ${funcName}_elem(loc, mem_loc, ${length})`,
                `    return (loc)`,
                `end`,
            ].join('\n'),
        });
        this.requireImport('starkware.cairo.common.dict', 'dict_write');
        this.requireImport('warplib.memory', 'wm_alloc');
        this.requireImport('starkware.cairo.common.uint256', 'uint256_sub');
        this.requireImport('starkware.cairo.common.uint256', 'Uint256');
        if ((0, nodeTypeProcessing_1.isReferenceType)(type.elementT)) {
            this.requireImport('warplib.memory', 'wm_read_id');
        }
        return funcName;
    }
    createDynamicArrayCopyFunction(key, type) {
        const funcName = `wm_to_storage${this.generatedFunctions.size}`;
        this.generatedFunctions.set(key, { name: funcName, code: '' });
        const elementT = (0, nodeTypeProcessing_1.getElementType)(type);
        const [elemMapping, lengthMapping] = this.dynArrayGen.gen(cairoTypeSystem_1.CairoType.fromSol(elementT, this.ast, cairoTypeSystem_1.TypeConversionContext.StorageAllocation));
        const implicits = '{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr : felt, warp_memory : DictAccess*}';
        const elementStorageWidth = cairoTypeSystem_1.CairoType.fromSol(elementT, this.ast, cairoTypeSystem_1.TypeConversionContext.StorageAllocation).width;
        const elementMemoryWidth = cairoTypeSystem_1.CairoType.fromSol(elementT, this.ast).width;
        let copyCode;
        if ((0, nodeTypeProcessing_1.isDynamicArray)(elementT)) {
            copyCode = [
                `    let (storage_id) = readId(storage_loc)`,
                `    let (read) = wm_read_id(mem_loc, ${(0, utils_2.uint256)(2)})`,
                `    ${this.getOrCreate(elementT)}(storage_id, read)`,
            ].join('\n');
        }
        else if ((0, nodeTypeProcessing_1.isReferenceType)(elementT)) {
            copyCode = [
                `    let (read) = wm_read_id(mem_loc, ${(0, utils_2.uint256)(elementMemoryWidth)})`,
                `    ${this.getOrCreate(elementT)}(storage_loc, read)`,
            ].join('\n');
        }
        else {
            copyCode = (0, utils_1.mapRange)(elementStorageWidth, (n) => [
                `    let (copy) = dict_read{dict_ptr=warp_memory}(${(0, base_1.add)('mem_loc', n)})`,
                `    WARP_STORAGE.write(${(0, base_1.add)('storage_loc', n)}, copy)`,
            ].join('\n')).join('\n');
        }
        const deleteRemainingCode = `${this.storageDeleteGen.genAuxFuncName(type)}(loc, mem_length, length)`;
        this.generatedFunctions.set(key, {
            name: funcName,
            code: [
                `func ${funcName}_elem${implicits}(storage_name: felt, mem_loc : felt, length: Uint256) -> ():`,
                `    alloc_locals`,
                `    if length.low == 0:`,
                `        if length.high == 0:`,
                `            return ()`,
                `        end`,
                `    end`,
                `    let (index) = uint256_sub(length, Uint256(1,0))`,
                `    let (storage_loc) = ${elemMapping}.read(storage_name, index)`,
                `    let mem_loc = mem_loc - ${elementMemoryWidth}`,
                `    if storage_loc == 0:`,
                `        let (storage_loc) = WARP_USED_STORAGE.read()`,
                `        WARP_USED_STORAGE.write(storage_loc + ${elementStorageWidth})`,
                `        ${elemMapping}.write(storage_name, index, storage_loc)`,
                copyCode,
                `    return ${funcName}_elem(storage_name, mem_loc, index)`,
                `    else:`,
                copyCode,
                `    return ${funcName}_elem(storage_name, mem_loc, index)`,
                `    end`,
                `end`,
                `func ${funcName}${implicits}(loc : felt, mem_loc : felt) -> (loc : felt):`,
                `    alloc_locals`,
                `    let (length) = ${lengthMapping}.read(loc)`,
                `    let (mem_length) = wm_dyn_array_length(mem_loc)`,
                `    ${lengthMapping}.write(loc, mem_length)`,
                `    let (narrowedLength) = narrow_safe(mem_length)`,
                `    ${funcName}_elem(loc, mem_loc + 2 + ${elementMemoryWidth} * narrowedLength, mem_length)`,
                `    let (lesser) = uint256_lt(mem_length, length)`,
                `    if lesser == 1:`,
                `       ${deleteRemainingCode}`,
                `       return (loc)`,
                `    else:`,
                `       return (loc)`,
                `    end`,
                `end`,
            ].join('\n'),
        });
        this.requireImport('starkware.cairo.common.dict', 'dict_read');
        this.requireImport('starkware.cairo.common.uint256', 'uint256_sub');
        this.requireImport('starkware.cairo.common.uint256', 'uint256_lt');
        this.requireImport('starkware.cairo.common.uint256', 'Uint256');
        this.requireImport('warplib.memory', 'wm_dyn_array_length');
        this.requireImport('warplib.maths.utils', 'narrow_safe');
        if ((0, nodeTypeProcessing_1.isReferenceType)(elementT)) {
            this.requireImport('warplib.memory', 'wm_read_id');
        }
        return funcName;
    }
}
exports.MemoryToStorageGen = MemoryToStorageGen;
function generateCopyInstructions(type, ast) {
    let members;
    if (type instanceof solc_typed_ast_1.UserDefinedType && type.definition instanceof solc_typed_ast_1.StructDefinition) {
        members = type.definition.vMembers.map((decl) => (0, solc_typed_ast_1.getNodeType)(decl, ast.compilerVersion));
    }
    else if (type instanceof solc_typed_ast_1.ArrayType && type.size !== undefined) {
        const narrowedWidth = (0, utils_1.narrowBigIntSafe)(type.size, `Array size ${type.size} not supported`);
        members = (0, utils_1.mapRange)(narrowedWidth, () => type.elementT);
    }
    else {
        throw new errors_1.TranspileFailedError(`Attempted to create incorrect form of memory->storage copy for ${(0, astPrinter_1.printTypeNode)(type)}`);
    }
    let storageOffset = 0;
    return members.flatMap((memberType) => {
        if ((0, nodeTypeProcessing_1.isReferenceType)(memberType)) {
            const offset = storageOffset;
            storageOffset += cairoTypeSystem_1.CairoType.fromSol(memberType, ast, cairoTypeSystem_1.TypeConversionContext.StorageAllocation).width;
            return [{ storageOffset: offset, copyType: memberType }];
        }
        else {
            const width = cairoTypeSystem_1.CairoType.fromSol(memberType, ast, cairoTypeSystem_1.TypeConversionContext.StorageAllocation).width;
            return (0, utils_1.mapRange)(width, () => ({ storageOffset: storageOffset++ }));
        }
    });
}
//# sourceMappingURL=memoryToStorage.js.map