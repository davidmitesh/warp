"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnumInputCheck = void 0;
const assert_1 = __importDefault(require("assert"));
const solc_typed_ast_1 = require("solc-typed-ast");
const cairoNodes_1 = require("../ast/cairoNodes");
const functionGeneration_1 = require("../utils/functionGeneration");
const utils_1 = require("../utils/utils");
const base_1 = require("./base");
class EnumInputCheck extends base_1.StringIndexedFuncGen {
    gen(node, nodeInput, enumDef, nodeInSourceUnit) {
        const nodeType = (0, solc_typed_ast_1.getNodeType)(node, this.ast.compilerVersion);
        const inputType = (0, solc_typed_ast_1.getNodeType)(nodeInput, this.ast.compilerVersion);
        this.sourceUnit = this.ast.getContainingRoot(nodeInSourceUnit);
        const name = this.getOrCreate(inputType, enumDef);
        const functionStub = (0, functionGeneration_1.createCairoFunctionStub)(name, [['arg', (0, utils_1.typeNameFromTypeNode)(inputType, this.ast), solc_typed_ast_1.DataLocation.Default]], [['ret', (0, utils_1.typeNameFromTypeNode)(nodeType, this.ast), solc_typed_ast_1.DataLocation.Default]], ['range_check_ptr'], this.ast, nodeInSourceUnit ?? nodeInput, {
            mutability: solc_typed_ast_1.FunctionStateMutability.Pure,
            stubKind: cairoNodes_1.FunctionStubKind.FunctionDefStub,
        });
        return (0, functionGeneration_1.createCallToFunction)(functionStub, [nodeInput], this.ast);
    }
    getOrCreate(type, enumDef) {
        const key = `${enumDef.name}_${type.pp()}`;
        const existing = this.generatedFunctions.get(key);
        if (existing !== undefined) {
            return existing.name;
        }
        (0, assert_1.default)(type instanceof solc_typed_ast_1.IntType);
        const funcName = `enum_bound_check${this.generatedFunctions.size}`;
        const implicits = '{range_check_ptr : felt}';
        const nMembers = enumDef.vMembers.length;
        const input256Bits = type.nBits === 256;
        this.generatedFunctions.set(key, {
            name: funcName,
            code: [
                `func ${funcName}${implicits}(${input256Bits ? 'arg_Uint256 : Uint256' : 'arg : felt'}) -> (arg: felt):`,
                '    alloc_locals',
                input256Bits ? ['    let (arg) = narrow_safe(arg_Uint256)'].join('\n') : ``,
                `    let (inRange : felt) = is_le_felt(arg, ${nMembers - 1})`,
                `    with_attr error_message("Error: value out-of-bounds. Values passed to must be in enum range (0, ${nMembers - 1}]."):`,
                `        assert 1 = inRange`,
                `    end`,
                `    return (arg)`,
                `end`,
            ].join('\n'),
        });
        if (input256Bits) {
            this.requireImport('warplib.maths.utils', 'narrow_safe');
            this.requireImport('starkware.cairo.common.uint256', 'Uint256');
        }
        this.requireImport('starkware.cairo.common.math_cmp', 'is_le_felt');
        return funcName;
    }
}
exports.EnumInputCheck = EnumInputCheck;
//# sourceMappingURL=enumInputCheck.js.map