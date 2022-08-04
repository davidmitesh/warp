"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CallDataToMemoryGen = void 0;
const solc_typed_ast_1 = require("solc-typed-ast");
const assert_1 = __importDefault(require("assert"));
const functionGeneration_1 = require("../../utils/functionGeneration");
const cairoTypeSystem_1 = require("../../utils/cairoTypeSystem");
const base_1 = require("../base");
const utils_1 = require("../../warplib/utils");
const errors_1 = require("../../utils/errors");
const astPrinter_1 = require("../../utils/astPrinter");
const utils_2 = require("../../utils/utils");
const nodeTypeProcessing_1 = require("../../utils/nodeTypeProcessing");
class CallDataToMemoryGen extends base_1.StringIndexedFuncGen {
    gen(node, nodeInSourceUnit) {
        const type = (0, solc_typed_ast_1.generalizeType)((0, solc_typed_ast_1.getNodeType)(node, this.ast.compilerVersion))[0];
        const name = this.getOrCreate(type);
        const functionStub = (0, functionGeneration_1.createCairoFunctionStub)(name, [['calldata', (0, utils_2.typeNameFromTypeNode)(type, this.ast), solc_typed_ast_1.DataLocation.CallData]], [['mem_loc', (0, utils_2.typeNameFromTypeNode)(type, this.ast), solc_typed_ast_1.DataLocation.Memory]], ['syscall_ptr', 'pedersen_ptr', 'range_check_ptr', 'warp_memory'], this.ast, nodeInSourceUnit ?? node, { mutability: solc_typed_ast_1.FunctionStateMutability.Pure });
        return (0, functionGeneration_1.createCallToFunction)(functionStub, [node], this.ast);
    }
    getOrCreate(type) {
        const key = type.pp();
        const existing = this.generatedFunctions.get(key);
        if (existing !== undefined) {
            return existing.name;
        }
        const funcName = `cd_to_memory${this.generatedFunctions.size}`;
        // Set an empty entry so recursive function generation doesn't clash
        this.generatedFunctions.set(key, { name: funcName, code: '' });
        const unexpectedTypeFunc = () => {
            throw new errors_1.NotSupportedYetError(`Copying ${(0, astPrinter_1.printTypeNode)(type)} from calldata to memory not implemented yet`);
        };
        const code = (0, base_1.delegateBasedOnType)(type, (type) => this.createDynamicArrayCopyFunction(funcName, type), (type) => this.createStaticArrayCopyFunction(funcName, type), (type) => this.createStructCopyFunction(funcName, type), unexpectedTypeFunc, unexpectedTypeFunc);
        this.generatedFunctions.set(key, code);
        return code.name;
    }
    createDynamicArrayCopyFunction(funcName, type) {
        this.requireImport('starkware.cairo.common.dict', 'dict_write');
        this.requireImport('starkware.cairo.common.uint256', 'Uint256');
        this.requireImport('warplib.memory', 'wm_new');
        this.requireImport('warplib.maths.utils', 'felt_to_uint256');
        const elementT = (0, nodeTypeProcessing_1.getElementType)(type);
        const size = (0, nodeTypeProcessing_1.getSize)(type);
        (0, assert_1.default)(size === undefined);
        const callDataType = cairoTypeSystem_1.CairoType.fromSol(type, this.ast, cairoTypeSystem_1.TypeConversionContext.CallDataRef);
        (0, assert_1.default)(callDataType instanceof cairoTypeSystem_1.CairoDynArray);
        const memoryElementWidth = cairoTypeSystem_1.CairoType.fromSol(elementT, this.ast).width;
        let copyCode;
        if ((0, nodeTypeProcessing_1.isReferenceType)(elementT)) {
            const recursiveFunc = this.getOrCreate(elementT);
            copyCode = [
                `let cdElem = calldata[0]`,
                `let (mElem) = ${recursiveFunc}(cdElem)`,
                `dict_write{dict_ptr=warp_memory}(mem_start, mElem)`,
            ].join('\n');
        }
        else if (memoryElementWidth === 2) {
            copyCode = [
                `dict_write{dict_ptr=warp_memory}(mem_start, calldata[0].low)`,
                `dict_write{dict_ptr=warp_memory}(mem_start+1, calldata[0].high)`,
            ].join('\n');
        }
        else {
            copyCode = `dict_write{dict_ptr=warp_memory}(mem_start, calldata[0])`;
        }
        return {
            name: funcName,
            code: [
                `func ${funcName}_elem${implicits}(calldata: ${callDataType.vPtr}, mem_start: felt, length: felt):`,
                `    alloc_locals`,
                `    if length == 0:`,
                `        return ()`,
                `    end`,
                copyCode,
                `    return ${funcName}_elem(calldata + ${callDataType.vPtr.to.width}, mem_start + ${memoryElementWidth}, length - 1)`,
                `end`,
                `func ${funcName}${implicits}(calldata : ${callDataType}) -> (mem_loc: felt):`,
                `    alloc_locals`,
                `    let (len256) = felt_to_uint256(calldata.len)`,
                `    let (mem_start) = wm_new(len256, ${(0, utils_1.uint256)(memoryElementWidth)})`,
                `    ${funcName}_elem(calldata.ptr, mem_start + 2, calldata.len)`,
                `    return (mem_start)`,
                `end`,
            ].join('\n'),
        };
    }
    createStaticArrayCopyFunction(funcName, type) {
        this.requireImport('starkware.cairo.common.dict', 'dict_write');
        this.requireImport('starkware.cairo.common.uint256', 'Uint256');
        this.requireImport('warplib.memory', 'wm_alloc');
        (0, assert_1.default)(type.size !== undefined);
        const callDataType = cairoTypeSystem_1.CairoType.fromSol(type, this.ast, cairoTypeSystem_1.TypeConversionContext.CallDataRef);
        const memoryType = cairoTypeSystem_1.CairoType.fromSol(type, this.ast, cairoTypeSystem_1.TypeConversionContext.MemoryAllocation);
        const memoryElementWidth = cairoTypeSystem_1.CairoType.fromSol(type.elementT, this.ast).width;
        const memoryOffsetMultiplier = memoryElementWidth === 1 ? '' : `* ${memoryElementWidth}`;
        let copyCode;
        const loc = (index) => index === 0 ? `mem_start` : `mem_start  + ${index}${memoryOffsetMultiplier}`;
        if ((0, nodeTypeProcessing_1.isReferenceType)(type.elementT)) {
            const recursiveFunc = this.getOrCreate(type.elementT);
            copyCode = (index) => [
                `let cdElem = calldata[${index}]`,
                `let (mElem) = ${recursiveFunc}(cdElem)`,
                `dict_write{dict_ptr=warp_memory}(${loc(index)}, mElem)`,
            ].join('\n');
        }
        else if (memoryElementWidth === 2) {
            copyCode = (index) => [
                `dict_write{dict_ptr=warp_memory}(${loc(index)}, calldata[${index}].low)`,
                `dict_write{dict_ptr=warp_memory}(${loc(index)} + 1, calldata[${index}].high)`,
            ].join('\n');
        }
        else {
            copyCode = (index) => `dict_write{dict_ptr=warp_memory}(${loc(index)}, calldata[${index}])`;
        }
        return {
            name: funcName,
            code: [
                `func ${funcName}${implicits}(calldata : ${callDataType}) -> (mem_loc: felt):`,
                `    alloc_locals`,
                `    let (mem_start) = wm_alloc(${(0, utils_1.uint256)(memoryType.width)})`,
                ...(0, utils_2.mapRange)((0, utils_2.narrowBigIntSafe)(type.size), (n) => copyCode(n)),
                `    return (mem_start)`,
                `end`,
            ].join('\n'),
        };
    }
    createStructCopyFunction(funcName, type) {
        this.requireImport('starkware.cairo.common.dict', 'dict_write');
        this.requireImport('starkware.cairo.common.uint256', 'Uint256');
        this.requireImport('warplib.memory', 'wm_alloc');
        const callDataType = cairoTypeSystem_1.CairoType.fromSol(type, this.ast, cairoTypeSystem_1.TypeConversionContext.CallDataRef);
        const memoryType = cairoTypeSystem_1.CairoType.fromSol(type, this.ast, cairoTypeSystem_1.TypeConversionContext.MemoryAllocation);
        const structDef = type.definition;
        (0, assert_1.default)(structDef instanceof solc_typed_ast_1.StructDefinition);
        let memOffset = 0;
        return {
            name: funcName,
            code: [
                `func ${funcName}${implicits}(calldata : ${callDataType}) -> (mem_loc: felt):`,
                `    alloc_locals`,
                `    let (mem_start) = wm_alloc(${(0, utils_1.uint256)(memoryType.width)})`,
                ...structDef.vMembers.map((decl) => {
                    const memberType = (0, solc_typed_ast_1.getNodeType)(decl, this.ast.compilerVersion);
                    if ((0, nodeTypeProcessing_1.isReferenceType)(memberType)) {
                        const recursiveFunc = this.getOrCreate(memberType);
                        const code = [
                            `let (m${memOffset}) = ${recursiveFunc}(calldata.${decl.name})`,
                            `dict_write{dict_ptr=warp_memory}(${(0, base_1.add)('mem_start', memOffset)}, m${memOffset})`,
                        ].join('\n');
                        memOffset++;
                        return code;
                    }
                    else {
                        const memberWidth = cairoTypeSystem_1.CairoType.fromSol(memberType, this.ast).width;
                        if (memberWidth === 2) {
                            return [
                                `dict_write{dict_ptr=warp_memory}(${(0, base_1.add)('mem_start', memOffset++)}, calldata.${decl.name}.low)`,
                                `dict_write{dict_ptr=warp_memory}(${(0, base_1.add)('mem_start', memOffset++)}, calldata.${decl.name}.high)`,
                            ].join('\n');
                        }
                        else {
                            return `dict_write{dict_ptr=warp_memory}(${(0, base_1.add)('mem_start', memOffset++)}, calldata.${decl.name})`;
                        }
                    }
                }),
                `    return (mem_start)`,
                `end`,
            ].join('\n'),
        };
    }
}
exports.CallDataToMemoryGen = CallDataToMemoryGen;
const implicits = '{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr : felt, warp_memory : DictAccess*}';
//# sourceMappingURL=calldataToMemory.js.map