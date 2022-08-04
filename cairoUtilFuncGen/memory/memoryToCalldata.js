"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryToCallDataGen = void 0;
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
class MemoryToCallDataGen extends base_1.StringIndexedFuncGen {
    constructor(dynamicArrayStructGen, ast, sourceUnit) {
        super(ast, sourceUnit);
        this.dynamicArrayStructGen = dynamicArrayStructGen;
    }
    gen(node, nodeInSourceUnit) {
        const type = (0, solc_typed_ast_1.generalizeType)((0, solc_typed_ast_1.getNodeType)(node, this.ast.compilerVersion))[0];
        if ((0, nodeTypeProcessing_1.isDynamicArray)(type)) {
            this.dynamicArrayStructGen.gen(node, nodeInSourceUnit);
        }
        const name = this.getOrCreate(type);
        const functionStub = (0, functionGeneration_1.createCairoFunctionStub)(name, [['mem_loc', (0, utils_1.typeNameFromTypeNode)(type, this.ast), solc_typed_ast_1.DataLocation.Memory]], [['retData', (0, utils_1.typeNameFromTypeNode)(type, this.ast), solc_typed_ast_1.DataLocation.CallData]], ['syscall_ptr', 'pedersen_ptr', 'range_check_ptr', 'warp_memory'], this.ast, nodeInSourceUnit ?? node, { mutability: solc_typed_ast_1.FunctionStateMutability.Pure });
        return (0, functionGeneration_1.createCallToFunction)(functionStub, [node], this.ast);
    }
    getOrCreate(type) {
        const key = type.pp();
        const existing = this.generatedFunctions.get(key);
        if (existing !== undefined) {
            return existing.name;
        }
        const unexpectedTypeFunc = () => {
            throw new errors_1.NotSupportedYetError(`Copying ${(0, astPrinter_1.printTypeNode)(type)} from memory to calldata not implemented yet`);
        };
        return (0, base_1.delegateBasedOnType)(type, (type) => this.createDynamicArrayCopyFunction(key, type), (type) => this.createStaticArrayCopyFunction(key, type), (type) => this.createStructCopyFunction(key, type), unexpectedTypeFunc, unexpectedTypeFunc);
    }
    createStructCopyFunction(key, type) {
        const funcName = `wm_to_calldata${this.generatedFunctions.size}`;
        const implicits = '{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr : felt, warp_memory : DictAccess*}';
        const outputType = cairoTypeSystem_1.CairoType.fromSol(type, this.ast, cairoTypeSystem_1.TypeConversionContext.CallDataRef);
        (0, assert_1.default)(type instanceof solc_typed_ast_1.UserDefinedType);
        const structDef = type.definition;
        (0, assert_1.default)(structDef instanceof solc_typed_ast_1.StructDefinition);
        // Set an empty entry so recursive function generation doesn't clash
        this.generatedFunctions.set(key, { name: funcName, code: '' });
        let offset = 0;
        this.generatedFunctions.set(key, {
            name: funcName,
            code: [
                `func ${funcName}${implicits}(mem_loc : felt) -> (retData: ${outputType.toString()}):`,
                `    alloc_locals`,
                ...structDef.vMembers.map((decl, index) => {
                    const memberType = (0, solc_typed_ast_1.getNodeType)(decl, this.ast.compilerVersion);
                    if ((0, nodeTypeProcessing_1.isReferenceType)(memberType)) {
                        this.requireImport('warplib.memory', 'wm_read_id');
                        const allocSize = (0, nodeTypeProcessing_1.isDynamicArray)(memberType)
                            ? 2
                            : cairoTypeSystem_1.CairoType.fromSol(memberType, this.ast, cairoTypeSystem_1.TypeConversionContext.Ref).width;
                        const memberGetter = this.getOrCreate(memberType);
                        return [
                            `let (read_${index}) = wm_read_id(${(0, base_1.add)('mem_loc', offset++)}, ${(0, utils_2.uint256)(allocSize)})`,
                            `let (member${index}) = ${memberGetter}(read_${index})`,
                        ].join('\n');
                    }
                    else {
                        const memberCairoType = cairoTypeSystem_1.CairoType.fromSol(memberType, this.ast);
                        if (memberCairoType.width === 1) {
                            const code = `let (member${index}) = wm_read_felt(${(0, base_1.add)('mem_loc', offset++)})`;
                            this.requireImport('warplib.memory', 'wm_read_felt');
                            return code;
                        }
                        else if (memberCairoType.width === 2) {
                            const code = `let (member${index}) = wm_read_256(${(0, base_1.add)('mem_loc', offset)})`;
                            this.requireImport('warplib.memory', 'wm_read_256');
                            offset += 2;
                            return code;
                        }
                    }
                }),
                `    return (${outputType.toString()}(${(0, utils_1.mapRange)(structDef.vMembers.length, (n) => `member${n}`)}))`,
                `end`,
            ].join('\n'),
        });
        this.requireImport('starkware.cairo.common.dict', 'dict_read');
        return funcName;
    }
    createStaticArrayCopyFunction(key, type) {
        const funcName = `wm_to_calldata${this.generatedFunctions.size}`;
        const implicits = '{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr : felt, warp_memory : DictAccess*}';
        const outputType = cairoTypeSystem_1.CairoType.fromSol(type, this.ast, cairoTypeSystem_1.TypeConversionContext.CallDataRef);
        (0, assert_1.default)(type.size !== undefined);
        const length = (0, utils_1.narrowBigIntSafe)(type.size);
        const elementT = type.elementT;
        // Set an empty entry so recursive function generation doesn't clash
        this.generatedFunctions.set(key, { name: funcName, code: '' });
        let offset = 0;
        this.generatedFunctions.set(key, {
            name: funcName,
            code: [
                `func ${funcName}${implicits}(mem_loc : felt) -> (retData: ${outputType.toString()}):`,
                `    alloc_locals`,
                ...(0, utils_1.mapRange)(length, (index) => {
                    if ((0, nodeTypeProcessing_1.isReferenceType)(elementT)) {
                        this.requireImport('warplib.memory', 'wm_read_id');
                        const memberGetter = this.getOrCreate(elementT);
                        const allocSize = (0, nodeTypeProcessing_1.isDynamicArray)(elementT)
                            ? 2
                            : cairoTypeSystem_1.CairoType.fromSol(elementT, this.ast, cairoTypeSystem_1.TypeConversionContext.Ref).width;
                        return [
                            `let (read${index}) = wm_read_id(${(0, base_1.add)('mem_loc', offset++)}, ${(0, utils_2.uint256)(allocSize)})`,
                            `let (member${index}) = ${memberGetter}(read${index})`,
                        ].join('\n');
                    }
                    else {
                        const memberCairoType = cairoTypeSystem_1.CairoType.fromSol(elementT, this.ast);
                        if (memberCairoType.width === 1) {
                            const code = `let (member${index}) = wm_read_felt(${(0, base_1.add)('mem_loc', offset++)})`;
                            this.requireImport('warplib.memory', 'wm_read_felt');
                            return code;
                        }
                        else if (memberCairoType.width === 2) {
                            const code = `let (member${index}) = wm_read_256(${(0, base_1.add)('mem_loc', offset)})`;
                            this.requireImport('warplib.memory', 'wm_read_256');
                            offset += 2;
                            return code;
                        }
                    }
                }),
                `    return ((${(0, utils_1.mapRange)(length, (n) => `member${n}`)}))`,
                `end`,
            ].join('\n'),
        });
        this.requireImport('starkware.cairo.common.dict', 'dict_read');
        this.requireImport('starkware.cairo.common.uint256', 'Uint256');
        return funcName;
    }
    createDynamicArrayCopyFunction(key, type) {
        const funcName = `wm_to_calldata${this.generatedFunctions.size}`;
        // Set an empty entry so recursive function generation doesn't clash.
        this.generatedFunctions.set(key, { name: funcName, code: '' });
        const implicits = '{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr : felt, warp_memory : DictAccess*}';
        const outputType = cairoTypeSystem_1.CairoType.fromSol(type, this.ast, cairoTypeSystem_1.TypeConversionContext.CallDataRef);
        (0, assert_1.default)(outputType instanceof cairoTypeSystem_1.CairoDynArray);
        (0, assert_1.default)(type instanceof solc_typed_ast_1.ArrayType || type instanceof solc_typed_ast_1.BytesType || type instanceof solc_typed_ast_1.StringType);
        (0, assert_1.default)((0, nodeTypeProcessing_1.getSize)(type) === undefined);
        const elementT = (0, nodeTypeProcessing_1.getElementType)(type);
        if ((0, nodeTypeProcessing_1.isDynamicArray)(elementT)) {
            throw new errors_1.NotSupportedYetError(`Copying dynamic arrays with element type ${(0, astPrinter_1.printTypeNode)(elementT)} from memory to calldata is not supported yet`);
        }
        this.generatedFunctions.set(key, {
            name: funcName,
            code: [
                `func ${funcName}${implicits}(mem_loc: felt) -> (retData: ${outputType.toString()}):`,
                `    alloc_locals`,
                `    let (len_256) = wm_read_256(mem_loc)`,
                `    let (ptr : ${outputType.vPtr.toString()}) = alloc()`,
                `    let (len_felt) = narrow_safe(len_256)`,
                `    ${this.createDynArrayReader(elementT)}(len_felt, ptr, mem_loc + 2)`,
                `    return (${(0, cairoTypeSystem_1.generateCallDataDynArrayStructName)(elementT, this.ast)}(len=len_felt, ptr=ptr))`,
                `end`,
            ].join('\n'),
        });
        this.requireImport('starkware.cairo.common.alloc', 'alloc');
        this.requireImport('warplib.maths.utils', 'narrow_safe');
        this.requireImport('starkware.cairo.common.uint256', 'uint256_add');
        this.requireImport('warplib.memory', 'wm_read_256');
        return funcName;
    }
    createDynArrayReader(elementT) {
        const funcName = `wm_to_calldata${this.generatedFunctions.size}`;
        const key = elementT.pp() + 'dynReader';
        // Set an empty entry so recursive function generation doesn't clash
        this.generatedFunctions.set(key, { name: funcName, code: '' });
        const implicits = '{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr : felt, warp_memory : DictAccess*}';
        const cairoType = cairoTypeSystem_1.CairoType.fromSol(elementT, this.ast, cairoTypeSystem_1.TypeConversionContext.CallDataRef);
        const memWidth = cairoTypeSystem_1.CairoType.fromSol(elementT, this.ast).width;
        const ptrString = `${cairoType.toString()}`;
        let code = [''];
        if ((0, nodeTypeProcessing_1.isReferenceType)(elementT)) {
            const allocSize = (0, nodeTypeProcessing_1.isDynamicArray)(elementT)
                ? 2
                : cairoTypeSystem_1.CairoType.fromSol(elementT, this.ast, cairoTypeSystem_1.TypeConversionContext.Ref).width;
            code = [
                `let (mem_read0) = wm_read_id(mem_loc, ${(0, utils_2.uint256)(allocSize)})`,
                `let (mem_read1) = ${this.getOrCreate(elementT)}(mem_read0)`,
                `assert ptr[0] = mem_read1`,
            ];
            this.requireImport('warplib.memory', 'wm_read_id');
            this.requireImport('starkware.cairo.common.uint256', 'Uint256');
        }
        else if (cairoType.width === 1) {
            code = ['let (mem_read0) = wm_read_felt(mem_loc)', 'assert ptr[0] = mem_read0'];
            this.requireImport('warplib.memory', 'wm_read_felt');
        }
        else if (cairoType.width === 2) {
            code = ['let (mem_read0) = wm_read_256(mem_loc)', 'assert ptr[0] = mem_read0'];
            this.requireImport('warplib.memory', 'wm_read_256');
        }
        else {
            throw new errors_1.NotSupportedYetError(`Element type ${cairoType.toString()} not supported yet in m->c`);
        }
        this.generatedFunctions.set(funcName, {
            name: funcName,
            code: [
                `func ${funcName}${implicits}(len: felt, ptr: ${ptrString}*, mem_loc: felt) -> ():`,
                `    alloc_locals`,
                `    if len == 0:`,
                `         return ()`,
                `    end`,
                ...code,
                `    ${funcName}(len=len - 1, ptr=ptr + ${cairoType.width}, mem_loc=mem_loc + ${memWidth})`,
                `    return ()`,
                `end`,
            ].join('\n'),
        });
        this.requireImport('starkware.cairo.common.uint256', 'uint256_sub');
        return funcName;
    }
}
exports.MemoryToCallDataGen = MemoryToCallDataGen;
//# sourceMappingURL=memoryToCalldata.js.map