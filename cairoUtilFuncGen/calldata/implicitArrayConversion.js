"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImplicitArrayConversion = void 0;
const assert_1 = __importDefault(require("assert"));
const solc_typed_ast_1 = require("solc-typed-ast");
const cairoTypeSystem_1 = require("../../utils/cairoTypeSystem");
const cloning_1 = require("../../utils/cloning");
const functionGeneration_1 = require("../../utils/functionGeneration");
const nodeTypeProcessing_1 = require("../../utils/nodeTypeProcessing");
const utils_1 = require("../../utils/utils");
const utils_2 = require("../../warplib/utils");
const base_1 = require("../base");
const implicitConversion_1 = require("../memory/implicitConversion");
class ImplicitArrayConversion extends base_1.StringIndexedFuncGen {
    constructor(storageWriteGen, dynArrayGen, dynArrayIndexAccessGen, ast, sourceUnit) {
        super(ast, sourceUnit);
        this.storageWriteGen = storageWriteGen;
        this.dynArrayGen = dynArrayGen;
        this.dynArrayIndexAccessGen = dynArrayIndexAccessGen;
    }
    genIfNecessary(targetExpression, sourceExpression) {
        const targetType = (0, solc_typed_ast_1.generalizeType)((0, solc_typed_ast_1.getNodeType)(targetExpression, this.ast.compilerVersion))[0];
        const sourceType = (0, solc_typed_ast_1.generalizeType)((0, solc_typed_ast_1.getNodeType)(sourceExpression, this.ast.compilerVersion))[0];
        if (this.checkDims(targetType, sourceType) || this.checkSizes(targetType, sourceType)) {
            return [this.gen(targetExpression, sourceExpression), true];
        }
        else {
            return [sourceExpression, false];
        }
    }
    checkSizes(targetType, sourceType) {
        const targetBaseType = (0, implicitConversion_1.getBaseType)(targetType);
        const sourceBaseType = (0, implicitConversion_1.getBaseType)(sourceType);
        if (targetBaseType instanceof solc_typed_ast_1.IntType && sourceBaseType instanceof solc_typed_ast_1.IntType) {
            return ((targetBaseType.nBits > sourceBaseType.nBits && sourceBaseType.signed) ||
                (!targetBaseType.signed && targetBaseType.nBits === 256 && 256 > sourceBaseType.nBits));
        }
        if (targetBaseType instanceof solc_typed_ast_1.FixedBytesType && sourceBaseType instanceof solc_typed_ast_1.FixedBytesType) {
            return targetBaseType.size > sourceBaseType.size;
        }
        return false;
    }
    checkDims(targetType, sourceType) {
        const targetArray = (0, solc_typed_ast_1.generalizeType)(targetType)[0];
        const sourceArray = (0, solc_typed_ast_1.generalizeType)(sourceType)[0];
        if (targetArray instanceof solc_typed_ast_1.ArrayType && sourceArray instanceof solc_typed_ast_1.ArrayType) {
            const targetArrayElm = (0, solc_typed_ast_1.generalizeType)(targetArray.elementT)[0];
            const sourceArrayElm = (0, solc_typed_ast_1.generalizeType)(sourceArray.elementT)[0];
            if (targetArray.size !== undefined && sourceArray.size !== undefined) {
                if (targetArray.size > sourceArray.size) {
                    return true;
                }
                else if (targetArrayElm instanceof solc_typed_ast_1.ArrayType && sourceArrayElm instanceof solc_typed_ast_1.ArrayType) {
                    return this.checkDims(targetArrayElm, sourceArrayElm);
                }
                else {
                    return false;
                }
            }
            else if (targetArray.size === undefined && sourceArray.size !== undefined) {
                return true;
            }
            else if (targetArray.size === undefined && sourceArray.size === undefined)
                if (targetArrayElm instanceof solc_typed_ast_1.ArrayType && sourceArrayElm instanceof solc_typed_ast_1.ArrayType) {
                    return this.checkDims(targetArrayElm, sourceArrayElm);
                }
        }
        return false;
    }
    gen(lhs, rhs) {
        const lhsType = (0, solc_typed_ast_1.getNodeType)(lhs, this.ast.compilerVersion);
        const rhsType = (0, solc_typed_ast_1.getNodeType)(rhs, this.ast.compilerVersion);
        const name = this.getOrCreate(lhsType, rhsType);
        const functionStub = (0, functionGeneration_1.createCairoFunctionStub)(name, [
            ['lhs', (0, utils_1.typeNameFromTypeNode)(lhsType, this.ast), solc_typed_ast_1.DataLocation.Storage],
            ['rhs', (0, utils_1.typeNameFromTypeNode)(rhsType, this.ast), solc_typed_ast_1.DataLocation.CallData],
        ], [], ['syscall_ptr', 'bitwise_ptr', 'range_check_ptr', 'pedersen_ptr', 'bitwise_ptr'], this.ast, rhs);
        return (0, functionGeneration_1.createCallToFunction)(functionStub, [(0, cloning_1.cloneASTNode)(lhs, this.ast), (0, cloning_1.cloneASTNode)(rhs, this.ast)], this.ast);
    }
    getOrCreate(targetType, sourceType) {
        const sourceRepForKey = cairoTypeSystem_1.CairoType.fromSol((0, solc_typed_ast_1.generalizeType)(sourceType)[0], this.ast, cairoTypeSystem_1.TypeConversionContext.CallDataRef).fullStringRepresentation;
        // Even though the target is in Storage, a unique key is needed to set the function.
        // Using Calldata here gives us the full representation instead of WarpId provided by Storage.
        // This is only for KeyGen and no further processing.
        const targetRepForKey = cairoTypeSystem_1.CairoType.fromSol((0, solc_typed_ast_1.generalizeType)(targetType)[0], this.ast, cairoTypeSystem_1.TypeConversionContext.CallDataRef).fullStringRepresentation;
        const key = `${targetRepForKey}_${(0, implicitConversion_1.getBaseType)(targetType).pp()} -> ${sourceRepForKey}_${(0, implicitConversion_1.getBaseType)(sourceType).pp()}`;
        const existing = this.generatedFunctions.get(key);
        if (existing !== undefined) {
            return existing.name;
        }
        (0, assert_1.default)(targetType instanceof solc_typed_ast_1.PointerType && sourceType instanceof solc_typed_ast_1.PointerType);
        (0, assert_1.default)(targetType.to instanceof solc_typed_ast_1.ArrayType && sourceType.to instanceof solc_typed_ast_1.ArrayType);
        let cairoFunc;
        if (targetType.to.size === undefined && sourceType.to.size === undefined) {
            cairoFunc = this.DynamicToDynamicConversion(key, targetType, sourceType);
        }
        else if (targetType.to.size === undefined && sourceType.to.size !== undefined) {
            cairoFunc = this.staticToDynamicConversion(key, targetType, sourceType);
        }
        else {
            cairoFunc = this.staticToStaticConversion(key, targetType, sourceType);
        }
        return cairoFunc.name;
    }
    staticToStaticConversion(key, targetType, sourceType) {
        (0, assert_1.default)(targetType instanceof solc_typed_ast_1.PointerType && sourceType instanceof solc_typed_ast_1.PointerType);
        (0, assert_1.default)(targetType.to instanceof solc_typed_ast_1.ArrayType && sourceType.to instanceof solc_typed_ast_1.ArrayType);
        const targetElmType = targetType.to.elementT;
        const sourceElmType = sourceType.to.elementT;
        const funcName = `CD_ST_TO_WS_ST${this.generatedFunctions.size}`;
        this.generatedFunctions.set(key, { name: funcName, code: '' });
        const cairoSourceType = cairoTypeSystem_1.CairoType.fromSol(sourceType, this.ast, cairoTypeSystem_1.TypeConversionContext.CallDataRef);
        (0, assert_1.default)(sourceType.to.size !== undefined);
        const sizeSource = (0, utils_1.narrowBigIntSafe)(sourceType.to.size);
        const copyInstructions = this.generateS2SCopyInstructions(targetElmType, sourceElmType, sizeSource);
        const implicit = '{syscall_ptr : felt*, range_check_ptr, pedersen_ptr : HashBuiltin*, bitwise_ptr : BitwiseBuiltin*}';
        const code = [
            `func ${funcName}${implicit}(storage_loc: felt, arg: ${cairoSourceType.toString()}):`,
            `alloc_locals`,
            ...copyInstructions,
            '    return ()',
            'end',
        ].join('\n');
        this.addImports(targetElmType, sourceElmType);
        this.generatedFunctions.set(key, { name: funcName, code: code });
        return { name: funcName, code: code };
    }
    generateS2SCopyInstructions(targetElmType, sourceElmType, length) {
        const cairoTargetElementType = cairoTypeSystem_1.CairoType.fromSol(targetElmType, this.ast, cairoTypeSystem_1.TypeConversionContext.StorageAllocation);
        let offset = 0;
        const instructions = (0, utils_1.mapRange)(length, (index) => {
            let code;
            if (targetElmType instanceof solc_typed_ast_1.IntType) {
                (0, assert_1.default)(sourceElmType instanceof solc_typed_ast_1.IntType);
                if (targetElmType.nBits === sourceElmType.nBits) {
                    code = `     ${this.storageWriteGen.getOrCreate(targetElmType)}(${(0, base_1.add)('storage_loc', offset)}, arg[${index}])`;
                }
                else if (targetElmType.signed) {
                    code = [
                        `    let (arg_${index}) = warp_int${sourceElmType.nBits}_to_int${targetElmType.nBits}(arg[${index}])
            ${this.storageWriteGen.getOrCreate(targetElmType)}(${(0, base_1.add)('storage_loc', offset)}, arg_${index})`,
                    ].join('\n');
                }
                else {
                    code = [
                        `    let (arg_${index}) = felt_to_uint256(arg[${index}])`,
                        `    ${this.storageWriteGen.getOrCreate(targetElmType)}(${(0, base_1.add)('storage_loc', offset)}, arg_${index})`,
                    ].join('\n');
                }
            }
            else if (targetElmType instanceof solc_typed_ast_1.FixedBytesType &&
                sourceElmType instanceof solc_typed_ast_1.FixedBytesType) {
                if (targetElmType.size > sourceElmType.size) {
                    code = [
                        `    let (arg_${index}) = warp_bytes_widen${targetElmType.size === 32 ? '_256' : ''}(arg[${index}], ${(targetElmType.size - sourceElmType.size) * 8})`,
                        `    ${this.storageWriteGen.getOrCreate(targetElmType)}(${(0, base_1.add)('storage_loc', offset)}, arg_${index})`,
                    ].join('\n');
                }
                else {
                    code = `     ${this.storageWriteGen.getOrCreate(targetElmType)}(${(0, base_1.add)('storage_loc', offset)}, arg[${index}])`;
                }
            }
            else {
                if ((0, nodeTypeProcessing_1.isDynamicStorageArray)(targetElmType)) {
                    code = [
                        `    let (ref_${index}) = readId(${(0, base_1.add)('storage_loc', offset)})`,
                        `    ${this.getOrCreate(targetElmType, sourceElmType)}(ref_${index}, arg[${index}])`,
                    ].join('\n');
                }
                else {
                    code = [
                        `    ${this.getOrCreate(targetElmType, sourceElmType)}(${(0, base_1.add)('storage_loc', offset)}, arg[${index}])`,
                    ].join('\n');
                }
            }
            offset = offset + cairoTargetElementType.width;
            return code;
        });
        return instructions;
    }
    staticToDynamicConversion(key, targetType, sourceType) {
        (0, assert_1.default)(targetType instanceof solc_typed_ast_1.PointerType && sourceType instanceof solc_typed_ast_1.PointerType);
        (0, assert_1.default)(targetType.to instanceof solc_typed_ast_1.ArrayType && sourceType.to instanceof solc_typed_ast_1.ArrayType);
        (0, assert_1.default)(targetType.to.size === undefined && sourceType.to.size !== undefined);
        const targetElmType = targetType.to.elementT;
        const sourceElmType = sourceType.to.elementT;
        const funcName = `CD_ST_TO_WS_DY${this.generatedFunctions.size}`;
        this.generatedFunctions.set(key, { name: funcName, code: '' });
        const cairoTargetElementType = cairoTypeSystem_1.CairoType.fromSol(targetType.to.elementT, this.ast, cairoTypeSystem_1.TypeConversionContext.StorageAllocation);
        const cairoSourceType = cairoTypeSystem_1.CairoType.fromSol(sourceType, this.ast, cairoTypeSystem_1.TypeConversionContext.CallDataRef);
        const cairoSourceTypeString = cairoSourceType.toString();
        const sizeSource = (0, utils_1.narrowBigIntSafe)(sourceType.to.size);
        (0, assert_1.default)(sizeSource !== undefined);
        const dynArrayLengthName = this.dynArrayGen.gen(cairoTargetElementType)[1];
        const copyInstructions = this.generateS2DCopyInstructions(targetElmType, sourceElmType, sizeSource);
        const implicit = '{syscall_ptr : felt*, range_check_ptr, pedersen_ptr : HashBuiltin*, bitwise_ptr : BitwiseBuiltin*}';
        const code = [
            `func ${funcName}${implicit}(ref: felt, arg: ${cairoSourceTypeString}):`,
            `     alloc_locals`,
            (0, nodeTypeProcessing_1.isDynamicStorageArray)(targetType)
                ? `    ${dynArrayLengthName}.write(ref, ${(0, utils_2.uint256)(sourceType.to.size)})`
                : '',
            ...copyInstructions,
            '    return ()',
            'end',
        ].join('\n');
        this.addImports(targetElmType, sourceElmType);
        this.generatedFunctions.set(key, { name: funcName, code: code });
        return { name: funcName, code: code };
    }
    generateS2DCopyInstructions(targetElmType, sourceElmType, length) {
        const cairoTargetElementType = cairoTypeSystem_1.CairoType.fromSol(targetElmType, this.ast, cairoTypeSystem_1.TypeConversionContext.StorageAllocation);
        const instructions = (0, utils_1.mapRange)(length, (index) => {
            if (targetElmType instanceof solc_typed_ast_1.IntType) {
                (0, assert_1.default)(sourceElmType instanceof solc_typed_ast_1.IntType);
                if (targetElmType.nBits === sourceElmType.nBits) {
                    return [
                        `    let (storage_loc${index}) = ${this.dynArrayIndexAccessGen.getOrCreate(targetElmType)}(ref, ${(0, utils_2.uint256)(index)})`,
                        `    ${this.storageWriteGen.getOrCreate(targetElmType)}(storage_loc${index}, arg[${index}])`,
                    ].join('\n');
                }
                else if (targetElmType.signed) {
                    return [
                        `    let (arg_${index}) = warp_int${sourceElmType.nBits}_to_int${targetElmType.nBits}(arg[${index}])`,
                        `    let (storage_loc${index}) = ${this.dynArrayIndexAccessGen.getOrCreate(targetElmType)}(ref, ${(0, utils_2.uint256)(index)})`,
                        `    ${this.storageWriteGen.getOrCreate(targetElmType)}(storage_loc${index}, arg_${index})`,
                    ].join('\n');
                }
                else {
                    return [
                        `    let (arg_${index}) = felt_to_uint256(arg[${index}])`,
                        `    let (storage_loc${index}) = ${this.dynArrayIndexAccessGen.getOrCreate(targetElmType)}(ref, ${(0, utils_2.uint256)(index)})`,
                        `    ${this.storageWriteGen.getOrCreate(targetElmType)}(storage_loc${index}, arg_${index})`,
                    ].join('\n');
                }
            }
            else if (targetElmType instanceof solc_typed_ast_1.FixedBytesType &&
                sourceElmType instanceof solc_typed_ast_1.FixedBytesType) {
                if (targetElmType.size > sourceElmType.size) {
                    return [
                        `    let (arg_${index}) = warp_bytes_widen${targetElmType.size === 32 ? '_256' : ''}(arg[${index}], ${(targetElmType.size - sourceElmType.size) * 8})`,
                        `    let (storage_loc${index}) = ${this.dynArrayIndexAccessGen.getOrCreate(targetElmType)}(ref, ${(0, utils_2.uint256)(index)})`,
                        `    ${this.storageWriteGen.getOrCreate(targetElmType)}(storage_loc${index}, arg_${index})`,
                    ].join('\n');
                }
                else {
                    return [
                        `    let (storage_loc${index}) = ${this.dynArrayIndexAccessGen.getOrCreate(targetElmType)}(ref, ${(0, utils_2.uint256)(index)})`,
                        `    ${this.storageWriteGen.getOrCreate(targetElmType)}(storage_loc${index}, arg[${index}])`,
                    ].join('\n');
                }
            }
            else {
                if ((0, nodeTypeProcessing_1.isDynamicStorageArray)(targetElmType)) {
                    const dynArrayLengthName = this.dynArrayGen.gen(cairoTargetElementType)[1];
                    return [
                        `     let (storage_loc${index}) = ${this.dynArrayIndexAccessGen.getOrCreate(targetElmType)}(ref, ${(0, utils_2.uint256)(index)})`,
                        `     let (ref_${index}) = readId(storage_loc${index})`,
                        `     ${dynArrayLengthName}.write(ref_${index}, ${(0, utils_2.uint256)(length)})`,
                        `     ${this.getOrCreate(targetElmType, sourceElmType)}(ref_${index}, arg[${index}])`,
                    ].join('\n');
                }
                else {
                    return [
                        `     let (storage_loc${index}) = ${this.dynArrayIndexAccessGen.getOrCreate(targetElmType)}(ref, ${(0, utils_2.uint256)(index)})`,
                        `    ${this.getOrCreate(targetElmType, sourceElmType)}(storage_loc${index}, arg[${index}])`,
                    ].join('\n');
                }
            }
        });
        return instructions;
    }
    DynamicToDynamicConversion(key, targetType, sourceType) {
        (0, assert_1.default)(targetType instanceof solc_typed_ast_1.PointerType && sourceType instanceof solc_typed_ast_1.PointerType);
        (0, assert_1.default)(targetType.to instanceof solc_typed_ast_1.ArrayType && sourceType.to instanceof solc_typed_ast_1.ArrayType);
        (0, assert_1.default)(targetType.to.size === undefined && sourceType.to.size === undefined);
        const targetElmType = targetType.to.elementT;
        const sourceElmType = sourceType.to.elementT;
        const funcName = `CD_DY_TO_WS_DY${this.generatedFunctions.size}`;
        this.generatedFunctions.set(key, { name: funcName, code: '' });
        const cairoTargetElementType = cairoTypeSystem_1.CairoType.fromSol(targetType.to.elementT, this.ast, cairoTypeSystem_1.TypeConversionContext.StorageAllocation);
        const cairoSourceType = cairoTypeSystem_1.CairoType.fromSol(sourceType, this.ast, cairoTypeSystem_1.TypeConversionContext.CallDataRef);
        (0, assert_1.default)(cairoSourceType instanceof cairoTypeSystem_1.CairoDynArray);
        const dynArrayLengthName = this.dynArrayGen.gen(cairoTargetElementType)[1];
        const implicit = '{syscall_ptr : felt*, range_check_ptr, pedersen_ptr : HashBuiltin*, bitwise_ptr : BitwiseBuiltin*}';
        const loaderName = `DY_LOADER${this.generatedFunctions.size}`;
        const copyInstructions = this.generateDynCopyInstructions(targetElmType, sourceElmType);
        const code = [
            `func ${loaderName}${implicit}(ref: felt, len: felt, ptr: ${cairoSourceType.ptr_member.toString()}*, target_index: felt):`,
            `    alloc_locals`,
            `    if len == 0:`,
            `      return ()`,
            `    end`,
            `    let (storage_loc) = ${this.dynArrayIndexAccessGen.getOrCreate(targetElmType)}(ref, Uint256(target_index, 0))`,
            copyInstructions,
            `    return ${loaderName}(ref, len - 1, ptr + ${cairoSourceType.ptr_member.width}, target_index+ 1 )`,
            `end`,
            ``,
            `func ${funcName}${implicit}(ref: felt, source: ${cairoSourceType.toString()}):`,
            `     alloc_locals`,
            `    ${dynArrayLengthName}.write(ref, Uint256(source.len, 0))`,
            `    ${loaderName}(ref, source.len, source.ptr, 0)`,
            '    return ()',
            'end',
        ].join('\n');
        this.addImports(targetElmType, sourceElmType);
        this.generatedFunctions.set(key, { name: funcName, code: code });
        return { name: funcName, code: code };
    }
    generateDynCopyInstructions(targetElmType, sourceElmType) {
        if (sourceElmType instanceof solc_typed_ast_1.IntType && targetElmType instanceof solc_typed_ast_1.IntType) {
            return [
                sourceElmType.signed
                    ? `    let (val) = warp_int${sourceElmType.nBits}_to_int${targetElmType.nBits}(ptr[0])`
                    : `    let (val) = felt_to_uint256(ptr[0])`,
                `    ${this.storageWriteGen.getOrCreate(targetElmType)}(storage_loc, val)`,
            ].join('\n');
        }
        else if (targetElmType instanceof solc_typed_ast_1.FixedBytesType && sourceElmType instanceof solc_typed_ast_1.FixedBytesType) {
            return [
                targetElmType.size === 32
                    ? `    let (val) = warp_bytes_widen_256(ptr[0], ${(targetElmType.size - sourceElmType.size) * 8})`
                    : `    let (val) = warp_bytes_widen(ptr[0], ${(targetElmType.size - sourceElmType.size) * 8})`,
                `    ${this.storageWriteGen.getOrCreate(targetElmType)}(storage_loc, val)`,
            ].join('\n');
        }
        else {
            return (0, nodeTypeProcessing_1.isDynamicStorageArray)(targetElmType)
                ? `    let (ref_name) = readId(storage_loc)
          ${this.getOrCreate(targetElmType, sourceElmType)}(ref_name, ptr[0])`
                : `    ${this.getOrCreate(targetElmType, sourceElmType)}(storage_loc, ptr[0])`;
        }
    }
    addImports(targetElmType, sourceElmType) {
        if (targetElmType instanceof solc_typed_ast_1.IntType) {
            (0, assert_1.default)(sourceElmType instanceof solc_typed_ast_1.IntType);
            if (targetElmType.nBits > sourceElmType.nBits && targetElmType.signed) {
                this.requireImport('warplib.maths.int_conversions', `warp_int${sourceElmType.nBits}_to_int${targetElmType.nBits}`);
            }
            else {
                this.requireImport('warplib.maths.utils', 'felt_to_uint256');
            }
        }
        else if (targetElmType instanceof solc_typed_ast_1.FixedBytesType) {
            this.requireImport('warplib.maths.bytes_conversions', targetElmType.size === 32 ? 'warp_bytes_widen_256' : 'warp_bytes_widen');
        }
        this.requireImport('starkware.cairo.common.uint256', 'Uint256');
    }
}
exports.ImplicitArrayConversion = ImplicitArrayConversion;
//# sourceMappingURL=implicitArrayConversion.js.map