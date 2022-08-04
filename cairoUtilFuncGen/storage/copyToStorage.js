"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageToStorageGen = void 0;
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
  Generates functions to copy data from WARP_STORAGE to WARP_STORAGE
  The main point of care here is to copy dynamic arrays. Mappings and types containing them
  cannot be copied from storage to storage, and all types other than dynamic arrays can be
  copied by caring only about their width
*/
class StorageToStorageGen extends base_1.StringIndexedFuncGen {
    constructor(dynArrayGen, storageDeleteGen, ast, sourceUnit) {
        super(ast, sourceUnit);
        this.dynArrayGen = dynArrayGen;
        this.storageDeleteGen = storageDeleteGen;
    }
    gen(to, from, nodeInSourceUnit) {
        const toType = (0, solc_typed_ast_1.generalizeType)((0, solc_typed_ast_1.getNodeType)(to, this.ast.compilerVersion))[0];
        const fromType = (0, solc_typed_ast_1.generalizeType)((0, solc_typed_ast_1.getNodeType)(from, this.ast.compilerVersion))[0];
        const name = this.getOrCreate(toType, fromType);
        const functionStub = (0, functionGeneration_1.createCairoFunctionStub)(name, [
            ['toLoc', (0, utils_1.typeNameFromTypeNode)(toType, this.ast), solc_typed_ast_1.DataLocation.Storage],
            ['fromLoc', (0, utils_1.typeNameFromTypeNode)(fromType, this.ast), solc_typed_ast_1.DataLocation.Storage],
        ], [['retLoc', (0, utils_1.typeNameFromTypeNode)(toType, this.ast), solc_typed_ast_1.DataLocation.Storage]], ['syscall_ptr', 'pedersen_ptr', 'range_check_ptr', 'bitwise_ptr'], this.ast, nodeInSourceUnit ?? to, { mutability: solc_typed_ast_1.FunctionStateMutability.View });
        return (0, functionGeneration_1.createCallToFunction)(functionStub, [to, from], this.ast);
    }
    getOrCreate(toType, fromType) {
        const key = `${fromType.pp()}->${toType.pp()}`;
        const existing = this.generatedFunctions.get(key);
        if (existing !== undefined) {
            return existing.name;
        }
        const funcName = `ws_copy${this.generatedFunctions.size}`;
        // Set an empty entry so recursive function generation doesn't clash
        this.generatedFunctions.set(key, { name: funcName, code: '' });
        const cairoFunction = (0, base_1.delegateBasedOnType)(toType, (toType) => {
            (0, assert_1.default)(fromType instanceof solc_typed_ast_1.ArrayType ||
                fromType instanceof solc_typed_ast_1.BytesType ||
                fromType instanceof solc_typed_ast_1.StringType);
            if ((0, nodeTypeProcessing_1.getSize)(fromType) === undefined) {
                return this.createDynamicArrayCopyFunction(funcName, toType, fromType);
            }
            else {
                (0, assert_1.default)(fromType instanceof solc_typed_ast_1.ArrayType);
                return this.createStaticToDynamicArrayCopyFunction(funcName, toType, fromType);
            }
        }, (toType) => {
            (0, assert_1.default)(fromType instanceof solc_typed_ast_1.ArrayType);
            return this.createStaticArrayCopyFunction(funcName, toType, fromType);
        }, (toType) => this.createStructCopyFunction(funcName, toType), () => {
            throw new errors_1.TranspileFailedError('Attempted to create mapping clone function');
        }, (toType) => {
            if (toType instanceof solc_typed_ast_1.IntType) {
                (0, assert_1.default)(fromType instanceof solc_typed_ast_1.IntType);
                return this.createIntegerCopyFunction(funcName, toType, fromType);
            }
            else if (toType instanceof solc_typed_ast_1.FixedBytesType) {
                (0, assert_1.default)(fromType instanceof solc_typed_ast_1.FixedBytesType);
                return this.createFixedBytesCopyFunction(funcName, toType, fromType);
            }
            else {
                return this.createValueTypeCopyFunction(funcName, toType);
            }
        });
        this.generatedFunctions.set(key, cairoFunction);
        return cairoFunction.name;
    }
    createStructCopyFunction(funcName, type) {
        const def = type.definition;
        (0, assert_1.default)(def instanceof solc_typed_ast_1.StructDefinition);
        const members = def.vMembers.map((decl) => (0, solc_typed_ast_1.getNodeType)(decl, this.ast.compilerVersion));
        let offset = 0;
        return {
            name: funcName,
            code: [
                `func ${funcName}${implicits}(to_loc: felt, from_loc: felt) -> (retLoc: felt):`,
                `    alloc_locals`,
                ...members.map((memberType) => {
                    const width = cairoTypeSystem_1.CairoType.fromSol(memberType, this.ast, cairoTypeSystem_1.TypeConversionContext.StorageAllocation).width;
                    let code;
                    if ((0, nodeTypeProcessing_1.isReferenceType)(memberType)) {
                        const memberCopyFunc = this.getOrCreate(memberType, memberType);
                        code = `${memberCopyFunc}(${(0, base_1.add)('to_loc', offset)}, ${(0, base_1.add)('from_loc', offset)})`;
                    }
                    else {
                        code = (0, utils_1.mapRange)(width, (index) => copyAtOffset(index + offset)).join('\n');
                    }
                    offset += width;
                    return code;
                }),
                `    return (to_loc)`,
                `end`,
            ].join('\n'),
        };
    }
    createStaticArrayCopyFunction(funcName, toType, fromType) {
        (0, assert_1.default)(toType.size !== undefined, `Attempted to copy to storage dynamic array as static array in ${(0, astPrinter_1.printTypeNode)(fromType)}->${(0, astPrinter_1.printTypeNode)(toType)}`);
        (0, assert_1.default)(fromType.size !== undefined, `Attempted to copy from storage dynamic array as static array in ${(0, astPrinter_1.printTypeNode)(fromType)}->${(0, astPrinter_1.printTypeNode)(toType)}`);
        const elementCopyFunc = this.getOrCreate(toType.elementT, fromType.elementT);
        const toElemType = cairoTypeSystem_1.CairoType.fromSol(toType.elementT, this.ast, cairoTypeSystem_1.TypeConversionContext.StorageAllocation);
        const fromElemType = cairoTypeSystem_1.CairoType.fromSol(fromType.elementT, this.ast, cairoTypeSystem_1.TypeConversionContext.StorageAllocation);
        const copyCode = createElementCopy(toElemType, fromElemType, elementCopyFunc);
        const fromSize = (0, utils_1.narrowBigIntSafe)(fromType.size);
        const toSize = (0, utils_1.narrowBigIntSafe)(toType.size);
        let stopRecursion;
        if (fromSize === toSize) {
            stopRecursion = [`if index == ${fromSize}:`, `return ()`, `end`];
        }
        else {
            this.requireImport('starkware.cairo.common.math_cmp', 'is_le');
            stopRecursion = [
                `if index == ${toSize}:`,
                `    return ()`,
                `end`,
                `let (lesser) = is_le(index, ${fromSize - 1})`,
                `if lesser == 0:`,
                `    ${this.storageDeleteGen.genFuncName(toType.elementT)}(to_elem_loc)`,
                `    return ${funcName}_elem(to_elem_loc + ${toElemType.width}, from_elem_loc, index + 1)`,
                `end`,
            ];
        }
        return {
            name: funcName,
            code: [
                `func ${funcName}_elem${implicits}(to_elem_loc: felt, from_elem_loc: felt, index: felt) -> ():`,
                ...stopRecursion,
                `    ${copyCode('to_elem_loc', 'from_elem_loc')}`,
                `    return ${funcName}_elem(to_elem_loc + ${toElemType.width}, from_elem_loc + ${fromElemType.width}, index + 1)`,
                `end`,
                `func ${funcName}${implicits}(to_elem_loc: felt, from_elem_loc: felt) -> (retLoc: felt):`,
                `    ${funcName}_elem(to_elem_loc, from_elem_loc, 0)`,
                `    return (to_elem_loc)`,
                `end`,
            ].join('\n'),
        };
    }
    createDynamicArrayCopyFunction(funcName, toType, fromType) {
        const fromElementT = (0, nodeTypeProcessing_1.getElementType)(fromType);
        const fromSize = (0, nodeTypeProcessing_1.getSize)(fromType);
        const toElementT = (0, nodeTypeProcessing_1.getElementType)(toType);
        const toSize = (0, nodeTypeProcessing_1.getSize)(toType);
        (0, assert_1.default)(toSize === undefined, 'Attempted to copy to storage static array as dynamic array');
        (0, assert_1.default)(fromSize === undefined, 'Attempted to copy from storage static array as dynamic array');
        this.requireImport('starkware.cairo.common.uint256', 'Uint256');
        this.requireImport('starkware.cairo.common.uint256', 'uint256_sub');
        this.requireImport('starkware.cairo.common.uint256', 'uint256_lt');
        const elementCopyFunc = this.getOrCreate(toElementT, fromElementT);
        const fromElementCairoType = cairoTypeSystem_1.CairoType.fromSol(fromElementT, this.ast, cairoTypeSystem_1.TypeConversionContext.StorageAllocation);
        const toElementCairoType = cairoTypeSystem_1.CairoType.fromSol(toElementT, this.ast, cairoTypeSystem_1.TypeConversionContext.StorageAllocation);
        const [fromElementMapping, fromLengthMapping] = this.dynArrayGen.gen(fromElementCairoType);
        const [toElementMapping, toLengthMapping] = this.dynArrayGen.gen(toElementCairoType);
        const copyCode = createElementCopy(toElementCairoType, fromElementCairoType, elementCopyFunc);
        const deleteRemainingCode = `${this.storageDeleteGen.genAuxFuncName(toType)}(to_loc, from_length, to_length)`;
        return {
            name: funcName,
            code: [
                `func ${funcName}_elem${implicits}(to_loc: felt, from_loc: felt, length: Uint256) -> ():`,
                `    alloc_locals`,
                `    if length.low == 0:`,
                `        if length.high == 0:`,
                `            return ()`,
                `        end`,
                `    end`,
                `    let (index) = uint256_sub(length, Uint256(1,0))`,
                `    let (from_elem_loc) = ${fromElementMapping}.read(from_loc, index)`,
                `    let (to_elem_loc) = ${toElementMapping}.read(to_loc, index)`,
                `    if to_elem_loc == 0:`,
                `        let (to_elem_loc) = WARP_USED_STORAGE.read()`,
                `        WARP_USED_STORAGE.write(to_elem_loc + ${toElementCairoType.width})`,
                `        ${toElementMapping}.write(to_loc, index, to_elem_loc)`,
                `        ${copyCode('to_elem_loc', 'from_elem_loc')}`,
                `        return ${funcName}_elem(to_loc, from_loc, index)`,
                `    else:`,
                `        ${copyCode('to_elem_loc', 'from_elem_loc')}`,
                `        return ${funcName}_elem(to_loc, from_loc, index)`,
                `    end`,
                `end`,
                `func ${funcName}${implicits}(to_loc: felt, from_loc: felt) -> (retLoc: felt):`,
                `    alloc_locals`,
                `    let (from_length) = ${fromLengthMapping}.read(from_loc)`,
                `    let (to_length) = ${toLengthMapping}.read(to_loc)`,
                `    ${toLengthMapping}.write(to_loc, from_length)`,
                `    ${funcName}_elem(to_loc, from_loc, from_length)`,
                `    let (lesser) = uint256_lt(from_length, to_length)`,
                `    if lesser == 1:`,
                `       ${deleteRemainingCode}`,
                `       return (to_loc)`,
                `    else:`,
                `       return (to_loc)`,
                `    end`,
                `end`,
            ].join('\n'),
        };
    }
    createStaticToDynamicArrayCopyFunction(funcName, toType, fromType) {
        const toSize = (0, nodeTypeProcessing_1.getSize)(toType);
        const toElementT = (0, nodeTypeProcessing_1.getElementType)(toType);
        (0, assert_1.default)(fromType.size !== undefined);
        (0, assert_1.default)(toSize === undefined);
        this.requireImport('starkware.cairo.common.uint256', 'Uint256');
        this.requireImport('starkware.cairo.common.uint256', 'uint256_add');
        this.requireImport('starkware.cairo.common.uint256', 'uint256_lt');
        const elementCopyFunc = this.getOrCreate(toElementT, fromType.elementT);
        const fromElementCairoType = cairoTypeSystem_1.CairoType.fromSol(fromType.elementT, this.ast, cairoTypeSystem_1.TypeConversionContext.StorageAllocation);
        const toElementCairoType = cairoTypeSystem_1.CairoType.fromSol(toElementT, this.ast, cairoTypeSystem_1.TypeConversionContext.StorageAllocation);
        const [toElementMapping, toLengthMapping] = this.dynArrayGen.gen(toElementCairoType);
        const copyCode = createElementCopy(toElementCairoType, fromElementCairoType, elementCopyFunc);
        const deleteRemainingCode = `${this.storageDeleteGen.genAuxFuncName(toType)}(to_loc, from_length, to_length)`;
        return {
            name: funcName,
            code: [
                `func ${funcName}_elem${implicits}(to_loc: felt, from_elem_loc: felt, length: Uint256, index: Uint256) -> ():`,
                `    alloc_locals`,
                `    if length.low == index.low:`,
                `        if length.high == index.high:`,
                `            return ()`,
                `        end`,
                `    end`,
                `    let (to_elem_loc) = ${toElementMapping}.read(to_loc, index)`,
                `    let (next_index, carry) = uint256_add(index, Uint256(1,0))`,
                `    assert carry = 0`,
                `    if to_elem_loc == 0:`,
                `        let (to_elem_loc) = WARP_USED_STORAGE.read()`,
                `        WARP_USED_STORAGE.write(to_elem_loc + ${toElementCairoType.width})`,
                `        ${toElementMapping}.write(to_loc, index, to_elem_loc)`,
                `        ${copyCode('to_elem_loc', 'from_elem_loc')}`,
                `        return ${funcName}_elem(to_loc, from_elem_loc + ${fromElementCairoType.width}, length, next_index)`,
                `    else:`,
                `        ${copyCode('to_elem_loc', 'from_elem_loc')}`,
                `        return ${funcName}_elem(to_loc, from_elem_loc + ${fromElementCairoType.width}, length, next_index)`,
                `    end`,
                `end`,
                `func ${funcName}${implicits}(to_loc: felt, from_loc: felt) -> (retLoc: felt):`,
                `    alloc_locals`,
                `    let from_length  = ${(0, utils_2.uint256)((0, utils_1.narrowBigIntSafe)(fromType.size))}`,
                `    let (to_length) = ${toLengthMapping}.read(to_loc)`,
                `    ${toLengthMapping}.write(to_loc, from_length)`,
                `    ${funcName}_elem(to_loc, from_loc, from_length , Uint256(0,0))`,
                `    let (lesser) = uint256_lt(from_length, to_length)`,
                `    if lesser == 1:`,
                `       ${deleteRemainingCode}`,
                `       return (to_loc)`,
                `    else:`,
                `       return (to_loc)`,
                `    end`,
                `end`,
            ].join('\n'),
        };
    }
    createIntegerCopyFunction(funcName, toType, fromType) {
        (0, assert_1.default)(fromType.nBits <= toType.nBits, `Attempted to scale integer ${fromType.nBits} to ${toType.nBits}`);
        this.requireImport('starkware.cairo.common.uint256', 'Uint256');
        if (toType.signed) {
            this.requireImport('warplib.maths.int_conversions', `warp_int${fromType.nBits}_to_int${toType.nBits}`);
        }
        else {
            this.requireImport('warplib.maths.utils', 'felt_to_uint256');
        }
        // Read changes depending if From is 256 bits or less
        const readFromCode = fromType.nBits === 256
            ? [
                'let (from_low) = WARP_STORAGE.read(from_loc)',
                'let (from_high) = WARP_STORAGE.read(from_loc + 1)',
                'tempvar from_elem = Uint256(from_low, from_high)',
            ].join('\n')
            : 'let (from_elem) = WARP_STORAGE.read(from_loc)';
        // Scaling for ints is different than for uints
        // Also memory represenation only change when To is 256 bits
        // and From is lesser than 256 bits
        const scalingCode = toType.signed
            ? `let (to_elem) = warp_int${fromType.nBits}_to_int${toType.nBits}(from_elem)`
            : toType.nBits === 256 && fromType.nBits < 256
                ? 'let (to_elem) = felt_to_uint256(from_elem)'
                : `let to_elem = from_elem`;
        // Copy changes depending if To is 256 bits or less
        const copyToCode = toType.nBits === 256
            ? [
                'WARP_STORAGE.write(to_loc, to_elem.low)',
                'WARP_STORAGE.write(to_loc + 1, to_elem.high)',
            ].join('\n')
            : 'WARP_STORAGE.write(to_loc, to_elem)';
        return {
            name: funcName,
            code: [
                `func ${funcName}${implicits}(to_loc : felt, from_loc : felt) -> (ret_loc : felt):`,
                `   alloc_locals`,
                `   ${readFromCode}`,
                `   ${scalingCode}`,
                `   ${copyToCode}`,
                `   return (to_loc)`,
                `end`,
            ].join('\n'),
        };
    }
    createFixedBytesCopyFunction(funcName, toType, fromType) {
        const bitWidthDiff = (toType.size - fromType.size) * 8;
        (0, assert_1.default)(bitWidthDiff >= 0, `Attempted to scale fixed byte ${fromType.size} to ${toType.size}`);
        const conversionFunc = toType.size === 32 ? 'warp_bytes_widen_256' : 'warp_bytes_widen';
        this.requireImport('warplib.maths.bytes_conversions', conversionFunc);
        const readFromCode = fromType.size === 32
            ? [
                'let (from_low) = WARP_STORAGE.read(from_loc)',
                'let (from_high) = WARP_STORAGE.read(from_loc + 1)',
                'tempvar from_elem = Uint256(from_low, from_high)',
            ].join('\n')
            : 'let (from_elem) = WARP_STORAGE.read(from_loc)';
        const scalingCode = bitWidthDiff !== 0
            ? `let (to_elem) = ${conversionFunc}(from_elem, ${bitWidthDiff})`
            : 'let to_elem = from_elem';
        const copyToCode = toType.size === 32
            ? [
                'WARP_STORAGE.write(to_loc, to_elem.low)',
                'WARP_STORAGE.write(to_loc + 1, to_elem.high)',
            ].join('\n')
            : 'WARP_STORAGE.write(to_loc, to_elem)';
        return {
            name: funcName,
            code: [
                `func ${funcName}${implicits}(to_loc : felt, from_loc : felt) -> (ret_loc : felt):`,
                `   alloc_locals`,
                `   ${readFromCode}`,
                `   ${scalingCode}`,
                `   ${copyToCode}`,
                `   return (to_loc)`,
                `end`,
            ].join('\n'),
        };
    }
    createValueTypeCopyFunction(funcName, type) {
        const width = cairoTypeSystem_1.CairoType.fromSol(type, this.ast, cairoTypeSystem_1.TypeConversionContext.StorageAllocation).width;
        return {
            name: funcName,
            code: [
                `func ${funcName}${implicits}(to_loc : felt, from_loc : felt) -> (ret_loc : felt):`,
                `    alloc_locals`,
                ...(0, utils_1.mapRange)(width, copyAtOffset),
                `    return (to_loc)`,
                `end`,
            ].join('\n'),
        };
    }
}
exports.StorageToStorageGen = StorageToStorageGen;
const implicits = '{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr : felt, bitwise_ptr : BitwiseBuiltin*}';
function copyAtOffset(n) {
    return [
        `let (copy) = WARP_STORAGE.read(${(0, base_1.add)('from_loc', n)})`,
        `WARP_STORAGE.write(${(0, base_1.add)('to_loc', n)}, copy)`,
    ].join('\n');
}
function createElementCopy(toElementCairoType, fromElementCairoType, elementCopyFunc) {
    if (fromElementCairoType instanceof cairoTypeSystem_1.WarpLocation) {
        if (toElementCairoType instanceof cairoTypeSystem_1.WarpLocation) {
            return (to, from) => [
                `let (from_elem_id) = readId(${from})`,
                `let (to_elem_id) = readId(${to})`,
                `${elementCopyFunc}(to_elem_id, from_elem_id)`,
            ].join('\n');
        }
        else {
            return (to, from) => [`let (from_elem_id) = readId(${from})`, `${elementCopyFunc}(${to}, from_elem_id)`].join('\n');
        }
    }
    else {
        if (toElementCairoType instanceof cairoTypeSystem_1.WarpLocation) {
            return (to, from) => [`let (to_elem_id) = readId(${to})`, `${elementCopyFunc}(to_elem_id, ${from})`].join('\n');
        }
        else {
            return (to, from) => [`${elementCopyFunc}(${to}, ${from})`].join('\n');
        }
    }
}
//# sourceMappingURL=copyToStorage.js.map