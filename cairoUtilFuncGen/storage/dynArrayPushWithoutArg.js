"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DynArrayPushWithoutArgGen = void 0;
const assert_1 = __importDefault(require("assert"));
const solc_typed_ast_1 = require("solc-typed-ast");
const cairoTypeSystem_1 = require("../../utils/cairoTypeSystem");
const functionGeneration_1 = require("../../utils/functionGeneration");
const utils_1 = require("../../utils/utils");
const base_1 = require("../base");
class DynArrayPushWithoutArgGen extends base_1.StringIndexedFuncGen {
    constructor(dynArrayGen, ast, sourceUnit) {
        super(ast, sourceUnit);
        this.dynArrayGen = dynArrayGen;
    }
    gen(push, nodeInSourceUnit) {
        (0, assert_1.default)(push.vExpression instanceof solc_typed_ast_1.MemberAccess);
        const arrayType = (0, solc_typed_ast_1.getNodeType)(push.vExpression.vExpression, this.ast.compilerVersion);
        const elementType = (0, solc_typed_ast_1.getNodeType)(push, this.ast.compilerVersion);
        const name = this.getOrCreate(cairoTypeSystem_1.CairoType.fromSol(elementType, this.ast, cairoTypeSystem_1.TypeConversionContext.StorageAllocation));
        const functionStub = (0, functionGeneration_1.createCairoFunctionStub)(name, [['loc', (0, utils_1.typeNameFromTypeNode)(arrayType, this.ast), solc_typed_ast_1.DataLocation.Storage]], [['newElemLoc', (0, utils_1.typeNameFromTypeNode)(elementType, this.ast), solc_typed_ast_1.DataLocation.Storage]], ['syscall_ptr', 'pedersen_ptr', 'range_check_ptr'], this.ast, nodeInSourceUnit ?? push);
        return (0, functionGeneration_1.createCallToFunction)(functionStub, [push.vExpression.vExpression], this.ast);
    }
    getOrCreate(elementType) {
        const key = elementType.fullStringRepresentation;
        const existing = this.generatedFunctions.get(key);
        if (existing !== undefined) {
            return existing.name;
        }
        const [arrayName, lengthName] = this.dynArrayGen.gen(elementType);
        const funcName = `${arrayName}_PUSH`;
        this.generatedFunctions.set(key, {
            name: funcName,
            code: [
                `func ${funcName}{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr : felt}(loc: felt) -> (newElemLoc: felt):`,
                `    alloc_locals`,
                `    let (len) = ${lengthName}.read(loc)`,
                `    let (newLen, carry) = uint256_add(len, Uint256(1,0))`,
                `    assert carry = 0`,
                `    ${lengthName}.write(loc, newLen)`,
                `    let (existing) = ${arrayName}.read(loc, len)`,
                `    if (existing) == 0:`,
                `        let (used) = WARP_USED_STORAGE.read()`,
                `        WARP_USED_STORAGE.write(used + ${elementType.width})`,
                `        ${arrayName}.write(loc, len, used)`,
                `        return (used)`,
                `    else:`,
                `        return (existing)`,
                `    end`,
                `end`,
            ].join('\n'),
        });
        this.requireImport('starkware.cairo.common.uint256', 'Uint256');
        this.requireImport('starkware.cairo.common.uint256', 'uint256_add');
        return funcName;
    }
}
exports.DynArrayPushWithoutArgGen = DynArrayPushWithoutArgGen;
//# sourceMappingURL=dynArrayPushWithoutArg.js.map