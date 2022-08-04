"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBaseType = exports.MemoryImplicitConversionGen = void 0;
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
  Class that converts arrays with smaller element types into bigger types
  e. g.
    uint8[] -> uint256[]
    uint8[3] -> uint256[]
    uint8[3] -> uint256[3]
    uint8[3] -> uint256[8]
  Only int/uint or fixed bytes implicit conversions
*/
const IMPLICITS = '{range_check_ptr, bitwise_ptr : BitwiseBuiltin*, warp_memory : DictAccess*}';
class MemoryImplicitConversionGen extends base_1.StringIndexedFuncGen {
    constructor(memoryWrite, memoryRead, ast, sourceUnit) {
        super(ast, sourceUnit);
        this.memoryWrite = memoryWrite;
        this.memoryRead = memoryRead;
    }
    genIfNecesary(sourceExpression, targetType) {
        const sourceType = (0, solc_typed_ast_1.getNodeType)(sourceExpression, this.ast.compilerVersion);
        const generalTarget = (0, solc_typed_ast_1.generalizeType)(targetType)[0];
        const generalSource = (0, solc_typed_ast_1.generalizeType)(sourceType)[0];
        if (differentSizeArrays(generalTarget, generalSource)) {
            return [this.gen(sourceExpression, targetType), true];
        }
        const targetBaseType = getBaseType(targetType);
        const sourceBaseType = getBaseType(sourceType);
        // Cast Ints: intY[] -> intX[] with X > Y
        if (targetBaseType instanceof solc_typed_ast_1.IntType &&
            sourceBaseType instanceof solc_typed_ast_1.IntType &&
            targetBaseType.signed &&
            targetBaseType.nBits > sourceBaseType.nBits) {
            return [this.gen(sourceExpression, targetType), true];
        }
        if (targetBaseType instanceof solc_typed_ast_1.FixedBytesType &&
            sourceBaseType instanceof solc_typed_ast_1.FixedBytesType &&
            targetBaseType.size > sourceBaseType.size) {
            return [this.gen(sourceExpression, targetType), true];
        }
        const targetBaseCairoType = cairoTypeSystem_1.CairoType.fromSol(targetBaseType, this.ast, cairoTypeSystem_1.TypeConversionContext.Ref);
        const sourceBaseCairoType = cairoTypeSystem_1.CairoType.fromSol(sourceBaseType, this.ast, cairoTypeSystem_1.TypeConversionContext.Ref);
        // Casts anything with smaller memory space to a bigger one
        // Applies to uint only
        // (uintX[] -> uint256[])
        if (targetBaseCairoType.width > sourceBaseCairoType.width)
            return [this.gen(sourceExpression, targetType), true];
        return [sourceExpression, false];
    }
    gen(source, targetType) {
        const sourceType = (0, solc_typed_ast_1.getNodeType)(source, this.ast.compilerVersion);
        const name = this.getOrCreate(targetType, sourceType);
        const functionStub = (0, functionGeneration_1.createCairoFunctionStub)(name, [['source', (0, utils_1.typeNameFromTypeNode)(sourceType, this.ast), solc_typed_ast_1.DataLocation.Memory]], [['target', (0, utils_1.typeNameFromTypeNode)(targetType, this.ast), solc_typed_ast_1.DataLocation.Memory]], ['range_check_ptr', 'bitwise_ptr', 'warp_memory'], this.ast, this.sourceUnit);
        return (0, functionGeneration_1.createCallToFunction)(functionStub, [source], this.ast);
    }
    getOrCreate(targetType, sourceType) {
        const key = targetType.pp() + sourceType.pp();
        const existing = this.generatedFunctions.get(key);
        if (existing !== undefined) {
            return existing.name;
        }
        (0, assert_1.default)(targetType instanceof solc_typed_ast_1.PointerType && sourceType instanceof solc_typed_ast_1.PointerType);
        targetType = targetType.to;
        sourceType = sourceType.to;
        const unexpectedTypeFunc = () => {
            throw new errors_1.NotSupportedYetError(`Scaling ${(0, astPrinter_1.printTypeNode)(sourceType)} to ${(0, astPrinter_1.printTypeNode)(targetType)} from memory to storage not implemented yet`);
        };
        const cairoFunc = (0, base_1.delegateBasedOnType)(targetType, (targetType) => {
            (0, assert_1.default)(targetType instanceof solc_typed_ast_1.ArrayType && sourceType instanceof solc_typed_ast_1.ArrayType);
            return sourceType.size === undefined
                ? this.dynamicToDynamicArrayConversion(targetType, sourceType)
                : this.staticToDynamicArrayConversion(targetType, sourceType);
        }, (targetType) => {
            (0, assert_1.default)(sourceType instanceof solc_typed_ast_1.ArrayType);
            return this.staticToStaticArrayConversion(targetType, sourceType);
        }, unexpectedTypeFunc, unexpectedTypeFunc, unexpectedTypeFunc);
        this.generatedFunctions.set(key, cairoFunc);
        return cairoFunc.name;
    }
    staticToStaticArrayConversion(targetType, sourceType) {
        (0, assert_1.default)(targetType.size !== undefined &&
            sourceType.size !== undefined &&
            targetType.size >= sourceType.size);
        const [cairoTargetElementType, cairoSourceElementType] = typesToCairoTypes([targetType.elementT, sourceType.elementT], this.ast, cairoTypeSystem_1.TypeConversionContext.Ref);
        const sourceLoc = `${getOffset('source', 'index', cairoSourceElementType.width)}`;
        let sourceLocationCode;
        if (targetType.elementT instanceof solc_typed_ast_1.PointerType) {
            this.requireImport('warplib.memory', 'wm_read_id');
            const idAllocSize = (0, nodeTypeProcessing_1.isDynamicArray)(sourceType.elementT) ? 2 : cairoSourceElementType.width;
            sourceLocationCode = `let (source_elem) = wm_read_id(${sourceLoc}, ${(0, utils_2.uint256)(idAllocSize)})`;
        }
        else {
            sourceLocationCode = `let (source_elem) = ${this.memoryRead.getOrCreate(cairoSourceElementType)}(${sourceLoc})`;
        }
        const conversionCode = this.generateScalingCode(targetType.elementT, sourceType.elementT);
        const targetLoc = `${getOffset('target', 'index', cairoTargetElementType.width)}`;
        const targetCopyCode = `${this.memoryWrite.getOrCreate(targetType.elementT)}(${targetLoc}, target_elem)`;
        const allocSize = (0, utils_1.narrowBigIntSafe)(targetType.size) * cairoTargetElementType.width;
        const funcName = `memory_conversion_static_to_static${this.generatedFunctions.size}`;
        const code = [
            `func ${funcName}_copy${IMPLICITS}(source : felt, target : felt, index : felt):`,
            `   alloc_locals`,
            `   if index == ${sourceType.size}:`,
            `       return ()`,
            `   end`,
            `   ${sourceLocationCode}`,
            `   ${conversionCode}`,
            `   ${targetCopyCode}`,
            `   return ${funcName}_copy(source, target, index + 1)`,
            `end`,
            `func ${funcName}${IMPLICITS}(source : felt) -> (target : felt):`,
            `   alloc_locals`,
            `   let (target) = wm_alloc(${(0, utils_2.uint256)(allocSize)})`,
            `   ${funcName}_copy(source, target, 0)`,
            `   return(target)`,
            `end`,
        ].join('\n');
        this.requireImport('starkware.cairo.common.uint256', 'Uint256');
        this.requireImport('warplib.memory', 'wm_alloc');
        return { name: funcName, code: code };
    }
    staticToDynamicArrayConversion(targetType, sourceType) {
        (0, assert_1.default)(sourceType.size !== undefined);
        const [cairoTargetElementType, cairoSourceElementType] = typesToCairoTypes([targetType.elementT, sourceType.elementT], this.ast, cairoTypeSystem_1.TypeConversionContext.Ref);
        const sourceTWidth = cairoSourceElementType.width;
        const targetTWidth = cairoTargetElementType.width;
        const sourceLocationCode = ['let felt_index = index.low + index.high * 128'];
        if (sourceType.elementT instanceof solc_typed_ast_1.PointerType) {
            this.requireImport('warplib.memory', 'wm_read_id');
            const idAllocSize = (0, nodeTypeProcessing_1.isDynamicArray)(sourceType.elementT) ? 2 : cairoSourceElementType.width;
            sourceLocationCode.push(`let (source_elem) = wm_read_id(${getOffset('source', 'felt_index', sourceTWidth)}, ${(0, utils_2.uint256)(idAllocSize)})`);
        }
        else {
            sourceLocationCode.push(`let (source_elem) = ${this.memoryRead.getOrCreate(cairoSourceElementType)}(${getOffset('source', 'felt_index', sourceTWidth)})`);
        }
        const conversionCode = this.generateScalingCode(targetType.elementT, sourceType.elementT);
        const targetCopyCode = [
            `let (target_elem_loc) = wm_index_dyn(target, index, ${(0, utils_2.uint256)(targetTWidth)})`,
            `${this.memoryWrite.getOrCreate(targetType.elementT)}(target_elem_loc, target_elem)`,
        ];
        const funcName = `memory_conversion_static_to_dynamic${this.generatedFunctions.size}`;
        const code = [
            `func ${funcName}_copy${IMPLICITS}(source : felt, target : felt, index : Uint256, len : Uint256):`,
            `   alloc_locals`,
            `   if len.low == index.low:`,
            `       if len.high == index.high:`,
            `           return ()`,
            `       end`,
            `   end`,
            ...sourceLocationCode,
            `   ${conversionCode}`,
            ...targetCopyCode,
            `   let (next_index, _) = uint256_add(index, ${(0, utils_2.uint256)(1)})`,
            `   return ${funcName}_copy(source, target, next_index, len)`,
            `end`,
            `func ${funcName}${IMPLICITS}(source : felt) -> (target : felt):`,
            `   alloc_locals`,
            `   let len = ${(0, utils_2.uint256)(sourceType.size)}`,
            `   let (target) = wm_new(len, ${(0, utils_2.uint256)(targetTWidth)})`,
            `   ${funcName}_copy(source, target, Uint256(0, 0), len)`,
            `   return (target=target)`,
            `end`,
        ].join('\n');
        this.requireImport('starkware.cairo.common.uint256', 'Uint256');
        this.requireImport('starkware.cairo.common.uint256', 'uint256_add');
        this.requireImport('warplib.memory', 'wm_index_dyn');
        this.requireImport('warplib.memory', 'wm_new');
        return { name: funcName, code: code };
    }
    dynamicToDynamicArrayConversion(targetType, sourceType) {
        const [cairoTargetElementType, cairoSourceElementType] = typesToCairoTypes([targetType.elementT, sourceType.elementT], this.ast, cairoTypeSystem_1.TypeConversionContext.Ref);
        const sourceTWidth = cairoSourceElementType.width;
        const targetTWidth = cairoTargetElementType.width;
        const sourceLocationCode = [
            `let (source_elem_loc) = wm_index_dyn(source, index, ${(0, utils_2.uint256)(sourceTWidth)})`,
        ];
        if (sourceType.elementT instanceof solc_typed_ast_1.PointerType) {
            this.requireImport('warplib.memory', 'wm_read_id');
            const idAllocSize = (0, nodeTypeProcessing_1.isDynamicArray)(sourceType.elementT) ? 2 : cairoSourceElementType.width;
            sourceLocationCode.push(`let (source_elem) = wm_read_id(source_elem_loc, ${(0, utils_2.uint256)(idAllocSize)})`);
        }
        else {
            sourceLocationCode.push(`let (source_elem) = ${this.memoryRead.getOrCreate(cairoSourceElementType)}(source_elem_loc)`);
        }
        const conversionCode = this.generateScalingCode(targetType.elementT, sourceType.elementT);
        const targetCopyCode = [
            `let (target_elem_loc) = wm_index_dyn(target, index, ${(0, utils_2.uint256)(targetTWidth)})`,
            `${this.memoryWrite.getOrCreate(targetType.elementT)}(target_elem_loc, target_elem)`,
        ];
        const targetWidth = cairoTargetElementType.width;
        const funcName = `memory_conversion_dynamic_to_dynamic${this.generatedFunctions.size}`;
        const code = [
            `func ${funcName}_copy${IMPLICITS}(source : felt, target : felt, index : Uint256, len : Uint256):`,
            `   alloc_locals`,
            `   if len.low == index.low:`,
            `       if len.high == index.high:`,
            `           return ()`,
            `       end`,
            `   end`,
            ...sourceLocationCode,
            `   ${conversionCode}`,
            ...targetCopyCode,
            `   let (next_index, _) = uint256_add(index, ${(0, utils_2.uint256)(1)})`,
            `   return ${funcName}_copy(source, target, next_index, len)`,
            `end`,
            `func ${funcName}${IMPLICITS}(source : felt) -> (target : felt):`,
            `   alloc_locals`,
            `   let (len) = wm_dyn_array_length(source)`,
            `   let (target) = wm_new(len, ${(0, utils_2.uint256)(targetWidth)})`,
            `   ${funcName}_copy(source, target, Uint256(0, 0), len)`,
            `   return (target=target)`,
            `end`,
        ].join('\n');
        this.requireImport('starkware.cairo.common.uint256', 'Uint256');
        this.requireImport('starkware.cairo.common.uint256', 'uint256_add');
        this.requireImport('warplib.memory', 'wm_index_dyn');
        this.requireImport('warplib.memory', 'wm_new');
        return { name: funcName, code: code };
    }
    generateScalingCode(targetType, sourceType) {
        if (targetType instanceof solc_typed_ast_1.IntType) {
            (0, assert_1.default)(sourceType instanceof solc_typed_ast_1.IntType);
            return this.generateIntegerScalingCode(targetType, sourceType, 'target_elem', 'source_elem');
        }
        else if (targetType instanceof solc_typed_ast_1.FixedBytesType) {
            (0, assert_1.default)(sourceType instanceof solc_typed_ast_1.FixedBytesType);
            return this.generateFixedBytesScalingCode(targetType, sourceType, 'target_elem', 'source_elem');
        }
        else if (targetType instanceof solc_typed_ast_1.PointerType) {
            (0, assert_1.default)(sourceType instanceof solc_typed_ast_1.PointerType);
            return `let (target_elem) = ${this.getOrCreate(targetType, sourceType)}(source_elem)`;
        }
        else if (isNoScalableType(targetType)) {
            return `let target_elem = source_elem`;
        }
        else {
            throw new errors_1.TranspileFailedError(`Cannot scale ${(0, astPrinter_1.printTypeNode)(sourceType)} into ${(0, astPrinter_1.printTypeNode)(targetType)} from memory to strage`);
        }
    }
    generateIntegerScalingCode(targetType, sourceType, targetVar, sourceVar) {
        if (targetType.signed && targetType.nBits !== sourceType.nBits) {
            const conversionFunc = `warp_int${sourceType.nBits}_to_int${targetType.nBits}`;
            this.requireImport('warplib.maths.int_conversions', conversionFunc);
            return `let (${targetVar}) = ${conversionFunc}(${sourceVar})`;
        }
        else if (!targetType.signed && targetType.nBits === 256 && sourceType.nBits < 256) {
            const conversionFunc = `felt_to_uint256`;
            this.requireImport('warplib.maths.utils', conversionFunc);
            return `let (${targetVar}) = ${conversionFunc}(${sourceVar})`;
        }
        else {
            return `let ${targetVar} = ${sourceVar}`;
        }
    }
    generateFixedBytesScalingCode(targetType, sourceType, targetVar, sourceVar) {
        const widthDiff = targetType.size - sourceType.size;
        if (widthDiff === 0) {
            return `let ${targetVar} = ${sourceVar}`;
        }
        const conversionFunc = targetType.size === 32 ? 'warp_bytes_widen_256' : 'warp_bytes_widen';
        this.requireImport('warplib.maths.bytes_conversions', conversionFunc);
        return `let (${targetVar}) = ${conversionFunc}(${sourceVar}, ${widthDiff * 8})`;
    }
}
exports.MemoryImplicitConversionGen = MemoryImplicitConversionGen;
function getBaseType(type) {
    const deferencedType = (0, solc_typed_ast_1.generalizeType)(type)[0];
    return deferencedType instanceof solc_typed_ast_1.ArrayType
        ? getBaseType(deferencedType.elementT)
        : deferencedType;
}
exports.getBaseType = getBaseType;
function typesToCairoTypes(types, ast, conversionContext) {
    return types.map((t) => cairoTypeSystem_1.CairoType.fromSol(t, ast, conversionContext));
}
function getOffset(base, index, offset) {
    return offset === 0 ? base : offset === 1 ? `${base} + ${index}` : `${base} + ${index}*${offset}`;
}
function differentSizeArrays(targetType, sourceType) {
    if (!(targetType instanceof solc_typed_ast_1.ArrayType) || !(sourceType instanceof solc_typed_ast_1.ArrayType)) {
        return false;
    }
    if ((0, nodeTypeProcessing_1.isDynamicArray)(targetType) && (0, nodeTypeProcessing_1.isDynamicArray)(sourceType)) {
        return differentSizeArrays(targetType.elementT, sourceType.elementT);
    }
    if ((0, nodeTypeProcessing_1.isDynamicArray)(targetType)) {
        return true;
    }
    (0, assert_1.default)(targetType.size !== undefined && sourceType.size !== undefined);
    if (targetType.size > sourceType.size)
        return true;
    return differentSizeArrays(targetType.elementT, sourceType.elementT);
}
function isNoScalableType(type) {
    return (type instanceof solc_typed_ast_1.AddressType ||
        (type instanceof solc_typed_ast_1.UserDefinedType && type.definition instanceof solc_typed_ast_1.EnumDefinition));
}
//# sourceMappingURL=implicitConversion.js.map