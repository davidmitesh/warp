"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageToMemoryGen = void 0;
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
  Generates functions to copy data from WARP_STORAGE to warp_memory
  Specifically this has to deal with structs, static arrays, and dynamic arrays
  These require extra care because the representations are different in storage and memory
  In storage nested structures are stored in place, whereas in memory 'pointers' are used
*/
class StorageToMemoryGen extends base_1.StringIndexedFuncGen {
    constructor(dynArrayGen, ast, sourceUnit) {
        super(ast, sourceUnit);
        this.dynArrayGen = dynArrayGen;
    }
    gen(node, nodeInSourceUnit) {
        const type = (0, solc_typed_ast_1.generalizeType)((0, solc_typed_ast_1.getNodeType)(node, this.ast.compilerVersion))[0];
        const name = this.getOrCreate(type);
        const functionStub = (0, functionGeneration_1.createCairoFunctionStub)(name, [['loc', (0, utils_1.typeNameFromTypeNode)(type, this.ast), solc_typed_ast_1.DataLocation.Storage]], [['mem_loc', (0, utils_1.typeNameFromTypeNode)(type, this.ast), solc_typed_ast_1.DataLocation.Memory]], ['syscall_ptr', 'pedersen_ptr', 'range_check_ptr', 'warp_memory'], this.ast, nodeInSourceUnit ?? node, { mutability: solc_typed_ast_1.FunctionStateMutability.View });
        return (0, functionGeneration_1.createCallToFunction)(functionStub, [node], this.ast);
    }
    getOrCreate(type) {
        const key = type.pp();
        const existing = this.generatedFunctions.get(key);
        if (existing !== undefined) {
            return existing.name;
        }
        const unexpectedTypeFunc = () => {
            throw new errors_1.NotSupportedYetError(`Copying ${(0, astPrinter_1.printTypeNode)(type)} from storage to memory not implemented yet`);
        };
        return (0, base_1.delegateBasedOnType)(type, (type) => this.createDynamicArrayCopyFunction(key, type), (type) => this.createStaticArrayCopyFunction(key, type), (type) => this.createStructCopyFunction(key, type), unexpectedTypeFunc, unexpectedTypeFunc);
    }
    createStructCopyFunction(key, type) {
        const memoryType = cairoTypeSystem_1.CairoType.fromSol(type, this.ast, cairoTypeSystem_1.TypeConversionContext.MemoryAllocation);
        const funcName = `ws_to_memory${this.generatedFunctions.size}`;
        const implicits = '{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr : felt, warp_memory : DictAccess*}';
        // Set an empty entry so recursive function generation doesn't clash
        this.generatedFunctions.set(key, { name: funcName, code: '' });
        this.generatedFunctions.set(key, {
            name: funcName,
            code: [
                `func ${funcName}${implicits}(loc : felt) -> (mem_loc: felt):`,
                `    alloc_locals`,
                `    let (mem_start) = wm_alloc(${(0, utils_2.uint256)(memoryType.width)})`,
                ...generateCopyInstructions(type, this.ast).flatMap(({ storageOffset, copyType }, index) => [
                    this.getIterCopyCode(copyType, index, storageOffset),
                    `dict_write{dict_ptr=warp_memory}(${(0, base_1.add)('mem_start', index)}, copy${index})`,
                ]),
                `    return (mem_start)`,
                `end`,
            ].join('\n'),
        });
        this.requireImport('starkware.cairo.common.dict', 'dict_write');
        this.requireImport('warplib.memory', 'wm_alloc');
        return funcName;
    }
    createStaticArrayCopyFunction(key, type) {
        (0, assert_1.default)(type.size !== undefined, 'Expected static array with known size');
        return type.size <= 5
            ? this.createSmallStaticArrayCopyFunction(key, type)
            : this.createLargeStaticArrayCopyFunction(key, type);
    }
    createSmallStaticArrayCopyFunction(key, type) {
        const memoryType = cairoTypeSystem_1.CairoType.fromSol(type, this.ast, cairoTypeSystem_1.TypeConversionContext.MemoryAllocation);
        const funcName = `ws_to_memory${this.generatedFunctions.size}`;
        const implicits = '{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr : felt, warp_memory : DictAccess*}';
        // Set an empty entry so recursive function generation doesn't clash
        this.generatedFunctions.set(key, { name: funcName, code: '' });
        this.generatedFunctions.set(key, {
            name: funcName,
            code: [
                `func ${funcName}${implicits}(loc : felt) -> (mem_loc : felt):`,
                `    alloc_locals`,
                `    let length = ${(0, utils_2.uint256)(memoryType.width)}`,
                `    let (mem_start) = wm_alloc(length)`,
                ...generateCopyInstructions(type, this.ast).flatMap(({ storageOffset, copyType }, index) => [
                    this.getIterCopyCode(copyType, index, storageOffset),
                    `dict_write{dict_ptr=warp_memory}(${(0, base_1.add)('mem_start', index)}, copy${index})`,
                ]),
                `    return (mem_start)`,
                `end`,
            ].join('\n'),
        });
        this.requireImport('starkware.cairo.common.dict', 'dict_write');
        this.requireImport('warplib.memory', 'wm_alloc');
        return funcName;
    }
    createLargeStaticArrayCopyFunction(key, type) {
        (0, assert_1.default)(type.size !== undefined, 'Expected static array with known size');
        const funcName = `ws_to_memory${this.generatedFunctions.size}`;
        const length = (0, utils_1.narrowBigIntSafe)(type.size, `Failed to narrow size of ${(0, astPrinter_1.printTypeNode)(type)} in memory->storage copy generation`);
        const implicits = '{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr : felt, warp_memory : DictAccess*}';
        // Set an empty entry so recursive function generation doesn't clash
        this.generatedFunctions.set(key, { name: funcName, code: '' });
        const elementMemoryWidth = cairoTypeSystem_1.CairoType.fromSol(type.elementT, this.ast).width;
        const elementStorageWidth = cairoTypeSystem_1.CairoType.fromSol(type.elementT, this.ast, cairoTypeSystem_1.TypeConversionContext.StorageAllocation).width;
        const copyCode = this.getRecursiveCopyCode(type.elementT, elementMemoryWidth, 'loc', 'mem_start');
        this.generatedFunctions.set(key, {
            name: funcName,
            code: [
                `func ${funcName}_elem${implicits}(mem_start: felt, loc : felt, length: Uint256) -> ():`,
                `   alloc_locals`,
                `   if length.low == 0:`,
                `       if length.high == 0:`,
                `           return ()`,
                `       end`,
                `   end`,
                `   let (index) = uint256_sub(length, Uint256(1, 0))`,
                copyCode,
                `   return ${funcName}_elem(${(0, base_1.add)('mem_start', elementMemoryWidth)}, ${(0, base_1.add)('loc', elementStorageWidth)}, index)`,
                `end`,
                `func ${funcName}${implicits}(loc : felt) -> (mem_loc : felt):`,
                `    alloc_locals`,
                `    let length = ${(0, utils_2.uint256)(length)}`,
                `    let (mem_start) = wm_alloc(length)`,
                `    ${funcName}_elem(mem_start, loc, length)`,
                `    return (mem_start)`,
                `end`,
            ].join('\n'),
        });
        this.requireImport('starkware.cairo.common.dict', 'dict_write');
        this.requireImport('warplib.memory', 'wm_alloc');
        this.requireImport('starkware.cairo.common.uint256', 'uint256_sub');
        this.requireImport('starkware.cairo.common.uint256', 'Uint256');
        return funcName;
    }
    createDynamicArrayCopyFunction(key, type) {
        const elementT = (0, nodeTypeProcessing_1.getElementType)(type);
        const memoryElementType = cairoTypeSystem_1.CairoType.fromSol(elementT, this.ast);
        const funcName = `ws_to_memory${this.generatedFunctions.size}`;
        this.generatedFunctions.set(key, {
            name: funcName,
            code: '',
        });
        const [elemMapping, lengthMapping] = this.dynArrayGen.gen(cairoTypeSystem_1.CairoType.fromSol(elementT, this.ast, cairoTypeSystem_1.TypeConversionContext.StorageAllocation));
        const implicits = '{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr : felt, warp_memory : DictAccess*}';
        // This is the code to copy a single element
        // Complex types require calls to another function generated here
        // Simple types take one or two WARP_STORAGE-dict_write pairs
        const copyCode = this.getRecursiveCopyCode(elementT, memoryElementType.width, 'element_storage_loc', 'mem_loc');
        // Now generate two functions: the setup function funcName, and the elementwise copy function: funcName_elem
        this.generatedFunctions.set(key, {
            name: funcName,
            code: [
                `func ${funcName}_elem${implicits}(storage_name: felt, mem_start: felt, length: Uint256) -> ():`,
                `    alloc_locals`,
                `    if length.low == 0:`,
                `        if length.high == 0:`,
                `            return ()`,
                `        end`,
                `    end`,
                `    let (index) = uint256_sub(length, Uint256(1,0))`,
                `    let (mem_loc) = wm_index_dyn(mem_start, index, ${(0, utils_2.uint256)(memoryElementType.width)})`,
                `    let (element_storage_loc) = ${elemMapping}.read(storage_name, index)`,
                copyCode,
                `    return ${funcName}_elem(storage_name, mem_start, index)`,
                `end`,
                `func ${funcName}${implicits}(loc : felt) -> (mem_loc : felt):`,
                `    alloc_locals`,
                `    let (length: Uint256) = ${lengthMapping}.read(loc)`,
                `    let (mem_start) = wm_new(length, ${(0, utils_2.uint256)(memoryElementType.width)})`,
                `    ${funcName}_elem(loc, mem_start, length)`,
                `    return (mem_start)`,
                `end`,
            ].join('\n'),
        });
        this.requireImport('starkware.cairo.common.dict', 'dict_write');
        this.requireImport('starkware.cairo.common.uint256', 'uint256_sub');
        this.requireImport('starkware.cairo.common.uint256', 'Uint256');
        this.requireImport('warplib.memory', 'wm_new');
        this.requireImport('warplib.memory', 'wm_index_dyn');
        return funcName;
    }
    // Copy code generation for iterative copy instructions (small static arrays and structs)
    getIterCopyCode(copyType, index, storageOffset) {
        if (copyType === undefined) {
            return `let (copy${index}) = WARP_STORAGE.read(${(0, base_1.add)('loc', storageOffset)})`;
        }
        const funcName = this.getOrCreate(copyType);
        return (0, nodeTypeProcessing_1.isDynamicArray)(copyType)
            ? [
                `let (dyn_loc) = WARP_STORAGE.read(${(0, base_1.add)('loc', storageOffset)})`,
                `let (copy${index}) = ${funcName}(dyn_loc)`,
            ].join('\n')
            : `let (copy${index}) = ${funcName}(${(0, base_1.add)('loc', storageOffset)})`;
    }
    // Copy code generation for recursive copy instructions (large static arrays and dynamic arrays)
    getRecursiveCopyCode(elementT, elementMemoryWidth, storageLoc, memoryLoc) {
        if (isStaticArrayOrStruct(elementT)) {
            return [
                `   let (copy) = ${this.getOrCreate(elementT)}(${storageLoc})`,
                `   dict_write{dict_ptr=warp_memory}(${memoryLoc}, copy)`,
            ].join('\n');
        }
        else if ((0, nodeTypeProcessing_1.isDynamicArray)(elementT)) {
            return [
                `   let (dyn_loc) = readId(${storageLoc})`,
                `   let (copy) = ${this.getOrCreate(elementT)}(dyn_loc)`,
                `   dict_write{dict_ptr=warp_memory}(${memoryLoc}, copy)`,
            ].join('\n');
        }
        else {
            return (0, utils_1.mapRange)(elementMemoryWidth, (n) => [
                `   let (copy) = WARP_STORAGE.read(${(0, base_1.add)(`${storageLoc}`, n)})`,
                `   dict_write{dict_ptr=warp_memory}(${(0, base_1.add)(`${memoryLoc}`, n)}, copy)`,
            ].join('\n')).join('\n');
        }
    }
}
exports.StorageToMemoryGen = StorageToMemoryGen;
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
        throw new errors_1.NotSupportedYetError(`Copying ${(0, astPrinter_1.printTypeNode)(type)} from storage to memory not implemented yet`);
    }
    let storageOffset = 0;
    return members.flatMap((memberType) => {
        if (isStaticArrayOrStruct(memberType)) {
            const offset = storageOffset;
            storageOffset += cairoTypeSystem_1.CairoType.fromSol(memberType, ast, cairoTypeSystem_1.TypeConversionContext.StorageAllocation).width;
            return [{ storageOffset: offset, copyType: memberType }];
        }
        else if ((0, nodeTypeProcessing_1.isDynamicArray)(memberType)) {
            return [{ storageOffset: storageOffset++, copyType: memberType }];
        }
        else {
            const width = cairoTypeSystem_1.CairoType.fromSol(memberType, ast, cairoTypeSystem_1.TypeConversionContext.StorageAllocation).width;
            return (0, utils_1.mapRange)(width, () => ({ storageOffset: storageOffset++ }));
        }
    });
}
function isStaticArrayOrStruct(type) {
    return ((type instanceof solc_typed_ast_1.ArrayType && type.size !== undefined) ||
        (type instanceof solc_typed_ast_1.UserDefinedType && type.definition instanceof solc_typed_ast_1.StructDefinition));
}
//# sourceMappingURL=storageToMemory.js.map