"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageReadGen = void 0;
const solc_typed_ast_1 = require("solc-typed-ast");
const cairoTypeSystem_1 = require("../../utils/cairoTypeSystem");
const cloning_1 = require("../../utils/cloning");
const functionGeneration_1 = require("../../utils/functionGeneration");
const base_1 = require("../base");
const serialisation_1 = require("../serialisation");
class StorageReadGen extends base_1.StringIndexedFuncGen {
    gen(storageLocation, type, nodeInSourceUnit) {
        const valueType = (0, solc_typed_ast_1.getNodeType)(storageLocation, this.ast.compilerVersion);
        const resultCairoType = cairoTypeSystem_1.CairoType.fromSol(valueType, this.ast, cairoTypeSystem_1.TypeConversionContext.StorageAllocation);
        const name = this.getOrCreate(resultCairoType);
        const functionStub = (0, functionGeneration_1.createCairoFunctionStub)(name, [['loc', (0, cloning_1.cloneASTNode)(type, this.ast), solc_typed_ast_1.DataLocation.Storage]], [
            [
                'val',
                (0, cloning_1.cloneASTNode)(type, this.ast),
                (0, base_1.locationIfComplexType)(valueType, solc_typed_ast_1.DataLocation.Storage),
            ],
        ], ['syscall_ptr', 'pedersen_ptr', 'range_check_ptr'], this.ast, nodeInSourceUnit ?? storageLocation, { mutability: solc_typed_ast_1.FunctionStateMutability.View });
        return (0, functionGeneration_1.createCallToFunction)(functionStub, [storageLocation], this.ast);
    }
    genFuncName(type) {
        const cairoType = cairoTypeSystem_1.CairoType.fromSol(type, this.ast, cairoTypeSystem_1.TypeConversionContext.StorageAllocation);
        return this.getOrCreate(cairoType);
    }
    getOrCreate(typeToRead) {
        const key = typeToRead.fullStringRepresentation;
        const existing = this.generatedFunctions.get(key);
        if (existing !== undefined) {
            return existing.name;
        }
        const funcName = `WS${this.generatedFunctions.size}_READ_${typeToRead.typeName}`;
        const resultCairoType = typeToRead.toString();
        const [reads, pack] = (0, serialisation_1.serialiseReads)(typeToRead, readFelt, readId);
        this.generatedFunctions.set(key, {
            name: funcName,
            code: [
                `func ${funcName}{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr : felt}(loc: felt) ->(val: ${resultCairoType}):`,
                `    alloc_locals`,
                ...reads.map((s) => `    ${s}`),
                `    return (${pack})`,
                'end',
            ].join('\n'),
        });
        return funcName;
    }
}
exports.StorageReadGen = StorageReadGen;
function readFelt(offset) {
    return `let (read${offset}) = WARP_STORAGE.read(${(0, base_1.add)('loc', offset)})`;
}
function readId(offset) {
    return `let (read${offset}) = readId(${(0, base_1.add)('loc', offset)})`;
}
//# sourceMappingURL=storageRead.js.map