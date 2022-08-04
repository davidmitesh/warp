"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MappingIndexAccessGen = void 0;
const assert_1 = __importDefault(require("assert"));
const solc_typed_ast_1 = require("solc-typed-ast");
const cairoTypeSystem_1 = require("../../utils/cairoTypeSystem");
const functionGeneration_1 = require("../../utils/functionGeneration");
const nodeTemplates_1 = require("../../utils/nodeTemplates");
const nodeTypeProcessing_1 = require("../../utils/nodeTypeProcessing");
const utils_1 = require("../../utils/utils");
const base_1 = require("../base");
class MappingIndexAccessGen extends base_1.StringIndexedFuncGen {
    constructor(dynArrayGen, ast, sourceUnit) {
        super(ast, sourceUnit);
        this.dynArrayGen = dynArrayGen;
        this.generatedHashFunctionNumber = 0;
    }
    gen(node, nodeInSourceUnit) {
        const base = node.vBaseExpression;
        let index = node.vIndexExpression;
        (0, assert_1.default)(index !== undefined);
        const nodeType = (0, solc_typed_ast_1.getNodeType)(node, this.ast.compilerVersion);
        const baseType = (0, solc_typed_ast_1.getNodeType)(base, this.ast.compilerVersion);
        (0, assert_1.default)(baseType instanceof solc_typed_ast_1.PointerType && baseType.to instanceof solc_typed_ast_1.MappingType);
        const indexCairoType = cairoTypeSystem_1.CairoType.fromSol(baseType.to.keyType, this.ast);
        const valueCairoType = cairoTypeSystem_1.CairoType.fromSol(nodeType, this.ast, cairoTypeSystem_1.TypeConversionContext.StorageAllocation);
        if ((0, nodeTypeProcessing_1.isReferenceType)(baseType.to.keyType)) {
            const stringLoc = (0, solc_typed_ast_1.generalizeType)((0, solc_typed_ast_1.getNodeType)(index, this.ast.compilerVersion))[1];
            (0, assert_1.default)(stringLoc !== undefined);
            const call = this.createStringHashFunction(node, stringLoc, indexCairoType);
            index = call;
        }
        const name = this.getOrCreate(indexCairoType, valueCairoType);
        const functionStub = (0, functionGeneration_1.createCairoFunctionStub)(name, [
            ['name', (0, utils_1.typeNameFromTypeNode)(baseType, this.ast), solc_typed_ast_1.DataLocation.Storage],
            [
                'index',
                (0, utils_1.typeNameFromTypeNode)(baseType.to.keyType, this.ast),
                (0, base_1.locationIfComplexType)(baseType.to.keyType, solc_typed_ast_1.DataLocation.Memory),
            ],
        ], [
            [
                'res',
                (0, utils_1.typeNameFromTypeNode)(nodeType, this.ast),
                (0, base_1.locationIfComplexType)(nodeType, solc_typed_ast_1.DataLocation.Storage),
            ],
        ], ['syscall_ptr', 'pedersen_ptr', 'range_check_ptr'], this.ast, nodeInSourceUnit ?? node);
        return (0, functionGeneration_1.createCallToFunction)(functionStub, [base, index], this.ast);
    }
    getOrCreate(indexType, valueType) {
        const key = `${indexType.fullStringRepresentation}/${valueType.fullStringRepresentation}`;
        const existing = this.generatedFunctions.get(key);
        if (existing !== undefined) {
            return existing.name;
        }
        const funcName = `WS${this.generatedFunctions.size - this.generatedHashFunctionNumber}_INDEX_${indexType.typeName}_to_${valueType.typeName}`;
        const mappingName = `WARP_MAPPING${this.generatedFunctions.size - this.generatedHashFunctionNumber}`;
        const indexTypeString = indexType.toString();
        this.generatedFunctions.set(key, {
            name: funcName,
            code: [
                `@storage_var`,
                `func ${mappingName}(name: felt, index: ${indexTypeString}) -> (resLoc : felt):`,
                `end`,
                `func ${funcName}{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr : felt}(name: felt, index: ${indexTypeString}) -> (res: felt):`,
                `    alloc_locals`,
                `    let (existing) = ${mappingName}.read(name, index)`,
                `    if existing == 0:`,
                `        let (used) = WARP_USED_STORAGE.read()`,
                `        WARP_USED_STORAGE.write(used + ${valueType.width})`,
                `        ${mappingName}.write(name, index, used)`,
                `        return (used)`,
                `    else:`,
                `        return (existing)`,
                `    end`,
                `end`,
            ].join('\n'),
        });
        return funcName;
    }
    createStringHashFunction(node, loc, indexCairoType) {
        (0, assert_1.default)(node.vIndexExpression instanceof solc_typed_ast_1.Expression);
        const indexType = (0, solc_typed_ast_1.getNodeType)(node.vIndexExpression, this.ast.compilerVersion);
        const indexTypeName = (0, utils_1.typeNameFromTypeNode)(indexType, this.ast);
        if (loc === solc_typed_ast_1.DataLocation.CallData) {
            const stub = (0, functionGeneration_1.createCairoFunctionStub)('string_hash', [['str', indexTypeName, solc_typed_ast_1.DataLocation.CallData]], [['hashedStr', (0, nodeTemplates_1.createUint8TypeName)(this.ast), solc_typed_ast_1.DataLocation.Default]], ['pedersen_ptr'], this.ast, node);
            const call = (0, functionGeneration_1.createCallToFunction)(stub, [node.vIndexExpression], this.ast);
            this.ast.registerImport(call, 'warplib.string_hash', 'string_hash');
            return call;
        }
        else if (loc === solc_typed_ast_1.DataLocation.Memory) {
            const stub = (0, functionGeneration_1.createCairoFunctionStub)('wm_string_hash', [['str', indexTypeName, solc_typed_ast_1.DataLocation.Memory]], [['hashedStr', (0, nodeTemplates_1.createUint8TypeName)(this.ast), solc_typed_ast_1.DataLocation.Default]], ['pedersen_ptr', 'range_check_ptr', 'warp_memory'], this.ast, node);
            const call = (0, functionGeneration_1.createCallToFunction)(stub, [node.vIndexExpression], this.ast);
            this.ast.registerImport(call, 'warplib.string_hash', 'wm_string_hash');
            return call;
        }
        else {
            const [data, len] = this.dynArrayGen.gen(indexCairoType);
            const key = `${data}/${len}_hash`;
            let funcName = `ws_string_hash${this.generatedHashFunctionNumber}`;
            const helperFuncName = `ws_to_felt_array${this.generatedHashFunctionNumber}`;
            const existing = this.generatedFunctions.get(key);
            if (existing === undefined) {
                this.generatedFunctions.set(key, {
                    name: funcName,
                    code: [
                        `func ${helperFuncName}{pedersen_ptr : HashBuiltin*, range_check_ptr, syscall_ptr : felt*}(`,
                        `    name : felt, ptr : felt*, len : felt`,
                        `):`,
                        `    alloc_locals`,
                        `    if len == 0:`,
                        `        return ()`,
                        `    end`,
                        `    let index = len - 1`,
                        `    let (index256) = felt_to_uint256(index)`,
                        `    let (loc) = ${data}.read(name, index256)`,
                        `    let (value) = WARP_STORAGE.read(loc)`,
                        `    assert ptr[index] = value`,
                        `    ${helperFuncName}(name, ptr, index)`,
                        `    return ()`,
                        `end`,
                        `func ${funcName}{pedersen_ptr : HashBuiltin*, range_check_ptr, syscall_ptr : felt*}(`,
                        `    name : felt`,
                        `) -> (hashedValue : felt):`,
                        `    alloc_locals`,
                        `    let (len256) = ${len}.read(name)`,
                        `    let (len) = narrow_safe(len256)`,
                        `    let (ptr) = alloc()`,
                        `    ${helperFuncName}(name, ptr, len)`,
                        `    let (hashValue) = string_hash(len, ptr)`,
                        `    return (hashValue)`,
                        `end`,
                    ].join('\n'),
                });
                this.generatedHashFunctionNumber++;
            }
            else {
                funcName = existing.name;
            }
            const stub = (0, functionGeneration_1.createCairoFunctionStub)(funcName, [['name', indexTypeName, solc_typed_ast_1.DataLocation.Storage]], [['hashedStr', (0, nodeTemplates_1.createUint8TypeName)(this.ast), solc_typed_ast_1.DataLocation.Default]], ['pedersen_ptr', 'range_check_ptr', 'syscall_ptr'], this.ast, node);
            const call = (0, functionGeneration_1.createCallToFunction)(stub, [node.vIndexExpression], this.ast);
            this.ast.registerImport(call, 'warplib.maths.utils', 'narrow_safe');
            this.ast.registerImport(call, 'warplib.maths.utils', 'felt_to_uint256');
            this.ast.registerImport(call, 'starkware.cairo.common.alloc', 'alloc');
            this.ast.registerImport(call, 'warplib.string_hash', 'string_hash');
            return call;
        }
    }
}
exports.MappingIndexAccessGen = MappingIndexAccessGen;
//# sourceMappingURL=mappingIndexAccess.js.map