"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryArrayConcat = void 0;
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
class MemoryArrayConcat extends base_1.StringIndexedFuncGen {
    gen(concat) {
        const args = concat.vArguments;
        args.forEach((expr) => {
            const exprType = (0, solc_typed_ast_1.getNodeType)(expr, this.ast.compilerVersion);
            if (!(0, nodeTypeProcessing_1.isDynamicArray)(exprType) &&
                !(exprType instanceof solc_typed_ast_1.IntType || exprType instanceof solc_typed_ast_1.FixedBytesType))
                throw new errors_1.TranspileFailedError(`Unexpected type ${(0, astPrinter_1.printTypeNode)(exprType)} in ${(0, astPrinter_1.printNode)(expr)} to concatenate.` +
                    'Expected FixedBytes, IntType, ArrayType, BytesType, or StringType');
        });
        const inputs = (0, utils_1.mapRange)(args.length, (n) => [
            `arg_${n}`,
            (0, utils_1.typeNameFromTypeNode)((0, solc_typed_ast_1.getNodeType)(args[n], this.ast.compilerVersion), this.ast),
            solc_typed_ast_1.DataLocation.Memory,
        ]);
        const output = [
            'res_loc',
            (0, utils_1.typeNameFromTypeNode)((0, solc_typed_ast_1.getNodeType)(concat, this.ast.compilerVersion), this.ast),
            solc_typed_ast_1.DataLocation.Memory,
        ];
        const argTypes = args.map((e) => (0, solc_typed_ast_1.getNodeType)(e, this.ast.compilerVersion));
        const name = this.getOrCreate(argTypes);
        const implicits = argTypes.some((type) => type instanceof solc_typed_ast_1.IntType || type instanceof solc_typed_ast_1.FixedBytesType)
            ? ['bitwise_ptr', 'range_check_ptr', 'warp_memory']
            : ['range_check_ptr', 'warp_memory'];
        const functionStub = (0, functionGeneration_1.createCairoFunctionStub)(name, inputs, [output], implicits, this.ast, concat);
        return (0, functionGeneration_1.createCallToFunction)(functionStub, args, this.ast);
    }
    getOrCreate(argTypes) {
        const key = argTypes
            .map((type) => {
            if (type instanceof solc_typed_ast_1.PointerType)
                return 'A';
            return `B${(0, utils_2.getIntOrFixedByteBitWidth)(type)}`;
        })
            .join('');
        const existing = this.generatedFunctions.get(key);
        if (existing !== undefined) {
            return existing.name;
        }
        const implicits = argTypes.some((type) => type instanceof solc_typed_ast_1.IntType || type instanceof solc_typed_ast_1.FixedBytesType)
            ? '{bitwise_ptr : BitwiseBuiltin*, range_check_ptr : felt, warp_memory : DictAccess*}'
            : '{range_check_ptr : felt, warp_memory : DictAccess*}';
        const cairoFunc = this.genearteBytesConcat(argTypes, implicits);
        this.generatedFunctions.set(key, cairoFunc);
        return cairoFunc.name;
    }
    genearteBytesConcat(argTypes, implicits) {
        const argAmount = argTypes.length;
        const funcName = `concat${this.generatedFunctions.size}_${argAmount}`;
        if (argAmount === 0) {
            this.requireImport('starkware.cairo.common.uint256', 'Uint256');
            this.requireImport('warplib.memory', 'wm_new');
            return {
                name: funcName,
                code: [
                    `func ${funcName}${implicits}() -> (res_loc : felt):`,
                    `   alloc_locals`,
                    `   let (res_loc) = wm_new(${(0, utils_2.uint256)(0)}, ${(0, utils_2.uint256)(1)})`,
                    `   return (res_loc)`,
                    `end`,
                ].join('\n'),
            };
        }
        const cairoArgs = argTypes.map((type, index) => {
            const cairoType = cairoTypeSystem_1.CairoType.fromSol(type, this.ast).toString();
            return `arg_${index} : ${cairoType}`;
        });
        const code = [
            `func ${funcName}${implicits}(${cairoArgs}) -> (res_loc : felt):`,
            `    alloc_locals`,
            `    # Get all sizes`,
            ...argTypes.map(getSize),
            `    let total_length = ${(0, utils_1.mapRange)(argAmount, (n) => `size_${n}`).join('+')}`,
            `    let (total_length256) = felt_to_uint256(total_length)`,
            `    let (res_loc) = wm_new(total_length256, ${(0, utils_2.uint256)(1)})`,
            `    # Copy values`,
            `    let start_loc = 0`,
            ...(0, utils_1.mapRange)(argAmount, (n) => {
                const copy = [
                    `let end_loc = start_loc + size_${n}`,
                    getCopyFunctionCall(argTypes[n], n),
                    `let start_loc = end_loc`,
                ];
                return n < argAmount - 1 ? copy.join('\n') : copy.slice(0, -1).join('\n');
            }),
            `    return (res_loc)`,
            `end`,
        ].join('\n');
        this.requireImport('starkware.cairo.common.uint256', 'Uint256');
        this.requireImport('warplib.maths.utils', 'felt_to_uint256');
        this.requireImport('warplib.memory', 'wm_new');
        argTypes.forEach((type) => {
            if (type instanceof solc_typed_ast_1.PointerType) {
                this.requireImport('warplib.memory', 'wm_dyn_array_length');
                this.requireImport('warplib.dynamic_arrays_util', 'dynamic_array_copy_felt');
            }
            else {
                (0, utils_2.getIntOrFixedByteBitWidth)(type) < 256
                    ? this.requireImport('warplib.dynamic_arrays_util', 'fixed_byte_to_dynamic_array')
                    : this.requireImport('warplib.dynamic_arrays_util', 'fixed_byte256_to_dynamic_array');
            }
        });
        return { name: funcName, code: code };
    }
}
exports.MemoryArrayConcat = MemoryArrayConcat;
function getSize(type, index) {
    if (type instanceof solc_typed_ast_1.PointerType)
        return [
            `let (size256_${index}) = wm_dyn_array_length(arg_${index})`,
            `let size_${index} = size256_${index}.low + size256_${index}.high*128`,
        ].join('\n');
    if (type instanceof solc_typed_ast_1.IntType) {
        return `let size_${index} = ${type.nBits / 8}`;
    }
    else if (type instanceof solc_typed_ast_1.FixedBytesType) {
        return `let size_${index} = ${type.size}`;
    }
    else {
        throw new errors_1.TranspileFailedError(`Attempted to get size for unexpected type ${(0, astPrinter_1.printTypeNode)(type)} in concat`);
    }
}
function getCopyFunctionCall(type, index) {
    if (type instanceof solc_typed_ast_1.PointerType)
        return `dynamic_array_copy_felt(res_loc, start_loc, end_loc, arg_${index}, 0)`;
    (0, assert_1.default)(type instanceof solc_typed_ast_1.FixedBytesType);
    if (type.size < 32)
        return `fixed_byte_to_dynamic_array(res_loc, start_loc, end_loc, arg_${index}, 0, size_${index})`;
    return `fixed_byte256_to_dynamic_array(res_loc, start_loc, end_loc, arg_${index}, 0)`;
}
//# sourceMappingURL=arrayConcat.js.map