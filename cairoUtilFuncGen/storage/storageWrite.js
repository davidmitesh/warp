"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageWriteGen = void 0;
const solc_typed_ast_1 = require("solc-typed-ast");
const cairoTypeSystem_1 = require("../../utils/cairoTypeSystem");
const cloning_1 = require("../../utils/cloning");
const functionGeneration_1 = require("../../utils/functionGeneration");
const utils_1 = require("../../utils/utils");
const base_1 = require("../base");
class StorageWriteGen extends base_1.StringIndexedFuncGen {
    gen(storageLocation, writeValue, nodeInSourceUnit) {
        const typeToWrite = (0, solc_typed_ast_1.getNodeType)(storageLocation, this.ast.compilerVersion);
        const name = this.getOrCreate(typeToWrite);
        const argTypeName = (0, utils_1.typeNameFromTypeNode)(typeToWrite, this.ast);
        const functionStub = (0, functionGeneration_1.createCairoFunctionStub)(name, [
            ['loc', argTypeName, solc_typed_ast_1.DataLocation.Storage],
            [
                'value',
                (0, cloning_1.cloneASTNode)(argTypeName, this.ast),
                typeToWrite instanceof solc_typed_ast_1.PointerType ? solc_typed_ast_1.DataLocation.Storage : solc_typed_ast_1.DataLocation.Default,
            ],
        ], [
            [
                'res',
                (0, cloning_1.cloneASTNode)(argTypeName, this.ast),
                typeToWrite instanceof solc_typed_ast_1.PointerType ? solc_typed_ast_1.DataLocation.Storage : solc_typed_ast_1.DataLocation.Default,
            ],
        ], ['syscall_ptr', 'pedersen_ptr', 'range_check_ptr'], this.ast, nodeInSourceUnit ?? storageLocation);
        return (0, functionGeneration_1.createCallToFunction)(functionStub, [storageLocation, writeValue], this.ast);
    }
    getOrCreate(typeToWrite) {
        const cairoTypeToWrite = cairoTypeSystem_1.CairoType.fromSol(typeToWrite, this.ast, cairoTypeSystem_1.TypeConversionContext.StorageAllocation);
        const key = cairoTypeToWrite.fullStringRepresentation;
        const existing = this.generatedFunctions.get(key);
        if (existing !== undefined) {
            return existing.name;
        }
        const cairoTypeString = cairoTypeToWrite.toString();
        const funcName = `WS_WRITE${this.generatedFunctions.size}`;
        this.generatedFunctions.set(key, {
            name: funcName,
            code: [
                `func ${funcName}{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr : felt}(loc: felt, value: ${cairoTypeString}) -> (res: ${cairoTypeString}):`,
                ...cairoTypeToWrite
                    .serialiseMembers('value')
                    .map((name, index) => `    ${write((0, base_1.add)('loc', index), name)}`),
                '    return (value)',
                'end',
            ].join('\n'),
        });
        return funcName;
    }
}
exports.StorageWriteGen = StorageWriteGen;
function write(offset, value) {
    return `WARP_STORAGE.write(${offset}, ${value})`;
}
//# sourceMappingURL=storageWrite.js.map