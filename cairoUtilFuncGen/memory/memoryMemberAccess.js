"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryMemberAccessGen = void 0;
const assert = require("assert");
const solc_typed_ast_1 = require("solc-typed-ast");
const cairoTypeSystem_1 = require("../../utils/cairoTypeSystem");
const cloning_1 = require("../../utils/cloning");
const functionGeneration_1 = require("../../utils/functionGeneration");
const utils_1 = require("../../utils/utils");
const base_1 = require("../base");
/*
  Produces a separate function for each struct type and member name, that when given
  the location of a struct produces the location of that member
  The actual code in the function is very simple, but is placed in a cairo function
  so that it doesn't get converted into fixed-width solidity arithmetic. A CairoExpression
  node could serve as an optimisation here
*/
class MemoryMemberAccessGen extends base_1.CairoUtilFuncGenBase {
    constructor() {
        super(...arguments);
        // cairoType -> property name -> code
        this.generatedFunctions = new Map();
    }
    // Concatenate all the generated cairo code into a single string
    getGeneratedCode() {
        return [...this.generatedFunctions.values()]
            .flatMap((map) => [...map.values()])
            .map((cairoMapping) => cairoMapping.code)
            .join('\n\n');
    }
    gen(memberAccess, nodeInSourceUnit) {
        const solType = (0, solc_typed_ast_1.getNodeType)(memberAccess.vExpression, this.ast.compilerVersion);
        assert(solType instanceof solc_typed_ast_1.PointerType);
        assert(solType.to instanceof solc_typed_ast_1.UserDefinedType);
        const structCairoType = cairoTypeSystem_1.CairoType.fromSol(solType, this.ast, cairoTypeSystem_1.TypeConversionContext.MemoryAllocation);
        const name = this.getOrCreate(structCairoType, memberAccess.memberName);
        const referencedDeclaration = memberAccess.vReferencedDeclaration;
        assert(referencedDeclaration instanceof solc_typed_ast_1.VariableDeclaration);
        const outType = referencedDeclaration.vType;
        assert(outType !== undefined);
        const functionStub = (0, functionGeneration_1.createCairoFunctionStub)(name, [['loc', (0, utils_1.typeNameFromTypeNode)(solType, this.ast), solc_typed_ast_1.DataLocation.Memory]], [['memberLoc', (0, cloning_1.cloneASTNode)(outType, this.ast), solc_typed_ast_1.DataLocation.Memory]], [], this.ast, nodeInSourceUnit ?? memberAccess);
        return (0, functionGeneration_1.createCallToFunction)(functionStub, [memberAccess.vExpression], this.ast);
    }
    getOrCreate(structCairoType, memberName) {
        const existingMemberAccesses = this.generatedFunctions.get(structCairoType.fullStringRepresentation) ??
            new Map();
        const existing = existingMemberAccesses.get(memberName);
        if (existing !== undefined) {
            return existing.name;
        }
        const structName = structCairoType.toString();
        assert(structCairoType instanceof cairoTypeSystem_1.CairoStruct, `Attempting to access struct member ${memberName} of non-struct type ${structName}`);
        const offset = structCairoType.offsetOf(memberName);
        const funcName = `WM${(0, utils_1.countNestedMapItems)(this.generatedFunctions)}_${structName}_${memberName}`;
        existingMemberAccesses.set(memberName, {
            name: funcName,
            code: [
                `func ${funcName}(loc: felt) -> (memberLoc: felt):`,
                `    return (${(0, base_1.add)('loc', offset)})`,
                `end`,
            ].join('\n'),
        });
        this.generatedFunctions.set(structCairoType.fullStringRepresentation, existingMemberAccesses);
        return funcName;
    }
}
exports.MemoryMemberAccessGen = MemoryMemberAccessGen;
//# sourceMappingURL=memoryMemberAccess.js.map