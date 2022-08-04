"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageMemberAccessGen = void 0;
const assert_1 = __importDefault(require("assert"));
const solc_typed_ast_1 = require("solc-typed-ast");
const cairoTypeSystem_1 = require("../../utils/cairoTypeSystem");
const cloning_1 = require("../../utils/cloning");
const functionGeneration_1 = require("../../utils/functionGeneration");
const utils_1 = require("../../utils/utils");
const base_1 = require("../base");
class StorageMemberAccessGen extends base_1.CairoUtilFuncGenBase {
    constructor() {
        super(...arguments);
        // cairoType -> property name -> code
        this.generatedFunctions = new Map();
    }
    getGeneratedCode() {
        return [...this.generatedFunctions.values()]
            .flatMap((map) => [...map.values()])
            .map((cairoMapping) => cairoMapping.code)
            .join('\n\n');
    }
    gen(memberAccess, nodeInSourceUnit) {
        const solType = (0, solc_typed_ast_1.getNodeType)(memberAccess.vExpression, this.ast.compilerVersion);
        (0, assert_1.default)(solType instanceof solc_typed_ast_1.PointerType);
        (0, assert_1.default)(solType.to instanceof solc_typed_ast_1.UserDefinedType);
        const structCairoType = cairoTypeSystem_1.CairoType.fromSol(solType, this.ast, cairoTypeSystem_1.TypeConversionContext.StorageAllocation);
        const name = this.getOrCreate(structCairoType, memberAccess.memberName);
        const referencedDeclaration = memberAccess.vReferencedDeclaration;
        (0, assert_1.default)(referencedDeclaration instanceof solc_typed_ast_1.VariableDeclaration);
        const outType = referencedDeclaration.vType;
        (0, assert_1.default)(outType !== undefined);
        const functionStub = (0, functionGeneration_1.createCairoFunctionStub)(name, [['loc', (0, utils_1.typeNameFromTypeNode)(solType, this.ast), solc_typed_ast_1.DataLocation.Storage]], [['memberLoc', (0, cloning_1.cloneASTNode)(outType, this.ast), solc_typed_ast_1.DataLocation.Storage]], [], this.ast, nodeInSourceUnit ?? memberAccess);
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
        (0, assert_1.default)(structCairoType instanceof cairoTypeSystem_1.CairoStruct, `Attempting to access struct member ${memberName} of non-struct type ${structName}`);
        const offset = structCairoType.offsetOf(memberName);
        const funcName = `WSM${(0, utils_1.countNestedMapItems)(this.generatedFunctions)}_${structName}_${memberName}`;
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
exports.StorageMemberAccessGen = StorageMemberAccessGen;
//# sourceMappingURL=storageMemberAccess.js.map