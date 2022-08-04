"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryStructGen = void 0;
const assert = require("assert");
const solc_typed_ast_1 = require("solc-typed-ast");
const cairoTypeSystem_1 = require("../../utils/cairoTypeSystem");
const cloning_1 = require("../../utils/cloning");
const functionGeneration_1 = require("../../utils/functionGeneration");
const nodeTypeProcessing_1 = require("../../utils/nodeTypeProcessing");
const utils_1 = require("../../warplib/utils");
const base_1 = require("../base");
/*
  Produces functions to allocate memory structs, assign their members, and return their location
  This replaces StructConstructorCalls referencing memory with normal FunctionCalls
*/
class MemoryStructGen extends base_1.StringIndexedFuncGen {
    gen(node) {
        const structDef = node.vReferencedDeclaration;
        assert(structDef instanceof solc_typed_ast_1.StructDefinition);
        const cairoType = cairoTypeSystem_1.CairoType.fromSol((0, solc_typed_ast_1.getNodeType)(node, this.ast.compilerVersion), this.ast, cairoTypeSystem_1.TypeConversionContext.MemoryAllocation);
        assert(cairoType instanceof cairoTypeSystem_1.CairoStruct);
        const name = this.getOrCreate(cairoType);
        const stub = (0, functionGeneration_1.createCairoFunctionStub)(name, structDef.vMembers.map((decl) => {
            assert(decl.vType !== undefined);
            const type = (0, nodeTypeProcessing_1.typeNameToSpecializedTypeNode)(decl.vType, solc_typed_ast_1.DataLocation.Memory);
            return [
                decl.name,
                (0, cloning_1.cloneASTNode)(decl.vType, this.ast),
                type instanceof solc_typed_ast_1.PointerType ? type.location : solc_typed_ast_1.DataLocation.Default,
            ];
        }), [
            [
                'res',
                new solc_typed_ast_1.UserDefinedTypeName(this.ast.reserveId(), '', `struct ${structDef.canonicalName}`, undefined, structDef.id, new solc_typed_ast_1.IdentifierPath(this.ast.reserveId(), '', structDef.name, structDef.id)),
                solc_typed_ast_1.DataLocation.Memory,
            ],
        ], ['range_check_ptr', 'warp_memory'], this.ast, node);
        structDef.vScope.acceptChildren();
        return (0, functionGeneration_1.createCallToFunction)(stub, node.vArguments, this.ast);
    }
    getOrCreate(structType) {
        const key = structType.fullStringRepresentation;
        const existing = this.generatedFunctions.get(key);
        if (existing !== undefined) {
            return existing.name;
        }
        const funcName = `WM${this.generatedFunctions.size}_struct_${structType.name}`;
        const argString = [...structType.members.entries()]
            .map(([name, type]) => `${name}: ${type.toString()}`)
            .join(', ');
        this.generatedFunctions.set(key, {
            name: funcName,
            code: [
                `func ${funcName}{range_check_ptr, warp_memory: DictAccess*}(${argString}) -> (res):`,
                `    alloc_locals`,
                `    let (start) = wm_alloc(${(0, utils_1.uint256)(structType.width)})`,
                [...structType.members.entries()]
                    .flatMap(([name, type]) => type.serialiseMembers(name))
                    .map(write)
                    .join('\n'),
                `    return (start)`,
                `end`,
            ].join('\n'),
        });
        this.requireImport('warplib.memory', 'wm_alloc');
        this.requireImport('starkware.cairo.common.dict', 'dict_write');
        this.requireImport('starkware.cairo.common.dict_access', 'DictAccess');
        this.requireImport('starkware.cairo.common.uint256', 'Uint256');
        return funcName;
    }
}
exports.MemoryStructGen = MemoryStructGen;
function write(name, offset) {
    return `dict_write{dict_ptr=warp_memory}(${(0, base_1.add)('start', offset)}, ${name})`;
}
//# sourceMappingURL=memoryStruct.js.map