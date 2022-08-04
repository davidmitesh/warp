"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryReadGen = void 0;
const solc_typed_ast_1 = require("solc-typed-ast");
const cairoTypeSystem_1 = require("../../utils/cairoTypeSystem");
const cloning_1 = require("../../utils/cloning");
const functionGeneration_1 = require("../../utils/functionGeneration");
const nodeTemplates_1 = require("../../utils/nodeTemplates");
const nodeTypeProcessing_1 = require("../../utils/nodeTypeProcessing");
const base_1 = require("../base");
const serialisation_1 = require("../serialisation");
/*
  Produces functions that when given a start location in warp_memory, deserialise all necessary
  felts to produce a full value. For example, a function to read a Uint256 reads the given location
  and the next one, and combines them into a Uint256 struct
*/
class MemoryReadGen extends base_1.StringIndexedFuncGen {
    gen(memoryRef, type, nodeInSourceUnit) {
        const valueType = (0, solc_typed_ast_1.generalizeType)((0, solc_typed_ast_1.getNodeType)(memoryRef, this.ast.compilerVersion))[0];
        const resultCairoType = cairoTypeSystem_1.CairoType.fromSol(valueType, this.ast);
        const params = [
            ['loc', (0, cloning_1.cloneASTNode)(type, this.ast), solc_typed_ast_1.DataLocation.Memory],
        ];
        const args = [memoryRef];
        if (resultCairoType instanceof cairoTypeSystem_1.MemoryLocation) {
            // The size parameter represents how much space to allocate
            // for the contents of the newly accessed suboject
            params.push(['size', (0, nodeTemplates_1.createNumberTypeName)(256, false, this.ast), solc_typed_ast_1.DataLocation.Default]);
            args.push((0, nodeTemplates_1.createNumberLiteral)((0, nodeTypeProcessing_1.isDynamicArray)(valueType)
                ? 2
                : cairoTypeSystem_1.CairoType.fromSol(valueType, this.ast, cairoTypeSystem_1.TypeConversionContext.MemoryAllocation).width, this.ast, 'uint256'));
        }
        const name = this.getOrCreate(resultCairoType);
        const functionStub = (0, functionGeneration_1.createCairoFunctionStub)(name, params, [
            [
                'val',
                (0, cloning_1.cloneASTNode)(type, this.ast),
                (0, base_1.locationIfComplexType)(valueType, solc_typed_ast_1.DataLocation.Memory),
            ],
        ], ['range_check_ptr', 'warp_memory'], this.ast, nodeInSourceUnit ?? memoryRef, { mutability: solc_typed_ast_1.FunctionStateMutability.View });
        return (0, functionGeneration_1.createCallToFunction)(functionStub, args, this.ast);
    }
    getOrCreate(typeToRead) {
        if (typeToRead instanceof cairoTypeSystem_1.MemoryLocation) {
            this.requireImport('warplib.memory', 'wm_read_id');
            return 'wm_read_id';
        }
        else if (typeToRead instanceof cairoTypeSystem_1.CairoFelt) {
            this.requireImport('warplib.memory', 'wm_read_felt');
            return 'wm_read_felt';
        }
        else if (typeToRead.fullStringRepresentation === cairoTypeSystem_1.CairoUint256.fullStringRepresentation) {
            this.requireImport('warplib.memory', 'wm_read_256');
            return 'wm_read_256';
        }
        const key = typeToRead.fullStringRepresentation;
        const existing = this.generatedFunctions.get(key);
        if (existing !== undefined) {
            return existing.name;
        }
        const funcName = `WM${this.generatedFunctions.size}_READ_${typeToRead.typeName}`;
        const resultCairoType = typeToRead.toString();
        const [reads, pack] = (0, serialisation_1.serialiseReads)(typeToRead, readFelt, readFelt);
        this.generatedFunctions.set(key, {
            name: funcName,
            code: [
                `func ${funcName}{range_check_ptr, warp_memory : DictAccess*}(loc: felt) ->(val: ${resultCairoType}):`,
                `    alloc_locals`,
                ...reads.map((s) => `    ${s}`),
                `    return (${pack})`,
                'end',
            ].join('\n'),
        });
        this.requireImport('starkware.cairo.common.dict', 'dict_read');
        return funcName;
    }
}
exports.MemoryReadGen = MemoryReadGen;
function readFelt(offset) {
    return `let (read${offset}) = dict_read{dict_ptr=warp_memory}(${(0, base_1.add)('loc', offset)})`;
}
//# sourceMappingURL=memoryRead.js.map