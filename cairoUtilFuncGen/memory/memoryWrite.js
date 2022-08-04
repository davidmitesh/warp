"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryWriteGen = void 0;
const solc_typed_ast_1 = require("solc-typed-ast");
const cairoTypeSystem_1 = require("../../utils/cairoTypeSystem");
const cloning_1 = require("../../utils/cloning");
const functionGeneration_1 = require("../../utils/functionGeneration");
const utils_1 = require("../../utils/utils");
const base_1 = require("../base");
/*
  Produces functions to write a given value into warp_memory, returning that value (to simulate assignments)
  This involves serialising the data into a series of felts and writing each one into the DictAccess
*/
class MemoryWriteGen extends base_1.StringIndexedFuncGen {
    gen(memoryRef, writeValue, nodeInSourceUnit) {
        const typeToWrite = (0, solc_typed_ast_1.getNodeType)(memoryRef, this.ast.compilerVersion);
        const name = this.getOrCreate(typeToWrite);
        const argTypeName = (0, utils_1.typeNameFromTypeNode)(typeToWrite, this.ast);
        const functionStub = (0, functionGeneration_1.createCairoFunctionStub)(name, [
            ['loc', argTypeName, solc_typed_ast_1.DataLocation.Memory],
            [
                'value',
                (0, cloning_1.cloneASTNode)(argTypeName, this.ast),
                typeToWrite instanceof solc_typed_ast_1.PointerType ? solc_typed_ast_1.DataLocation.Memory : solc_typed_ast_1.DataLocation.Default,
            ],
        ], [
            [
                'res',
                (0, cloning_1.cloneASTNode)(argTypeName, this.ast),
                typeToWrite instanceof solc_typed_ast_1.PointerType ? solc_typed_ast_1.DataLocation.Memory : solc_typed_ast_1.DataLocation.Default,
            ],
        ], ['warp_memory'], this.ast, nodeInSourceUnit ?? memoryRef);
        return (0, functionGeneration_1.createCallToFunction)(functionStub, [memoryRef, writeValue], this.ast);
    }
    getOrCreate(typeToWrite) {
        const cairoTypeToWrite = cairoTypeSystem_1.CairoType.fromSol(typeToWrite, this.ast);
        if (cairoTypeToWrite instanceof cairoTypeSystem_1.CairoFelt) {
            this.requireImport('warplib.memory', 'wm_write_felt');
            return 'wm_write_felt';
        }
        else if (cairoTypeToWrite.fullStringRepresentation === cairoTypeSystem_1.CairoUint256.fullStringRepresentation) {
            this.requireImport('warplib.memory', 'wm_write_256');
            return 'wm_write_256';
        }
        const key = cairoTypeToWrite.fullStringRepresentation;
        const existing = this.generatedFunctions.get(key);
        if (existing !== undefined) {
            return existing.name;
        }
        const cairoTypeString = cairoTypeToWrite.toString();
        const funcName = `WM_WRITE${this.generatedFunctions.size}`;
        this.generatedFunctions.set(key, {
            name: funcName,
            code: [
                `func ${funcName}{warp_memory : DictAccess*}(loc: felt, value: ${cairoTypeString}) -> (res: ${cairoTypeString}):`,
                ...cairoTypeToWrite
                    .serialiseMembers('value')
                    .map((name, index) => `    ${write(index, name)}`),
                '    return (value)',
                'end',
            ].join('\n'),
        });
        this.requireImport('starkware.cairo.common.dict', 'dict_write');
        return funcName;
    }
}
exports.MemoryWriteGen = MemoryWriteGen;
function write(offset, value) {
    return `dict_write{dict_ptr=warp_memory}(${(0, base_1.add)('loc', offset)}, ${value})`;
}
//# sourceMappingURL=memoryWrite.js.map