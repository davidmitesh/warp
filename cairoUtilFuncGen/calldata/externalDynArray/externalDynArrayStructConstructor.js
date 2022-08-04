"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExternalDynArrayStructConstructor = void 0;
const solc_typed_ast_1 = require("solc-typed-ast");
const assert_1 = __importDefault(require("assert"));
const functionGeneration_1 = require("../../../utils/functionGeneration");
const cairoTypeSystem_1 = require("../../../utils/cairoTypeSystem");
const base_1 = require("../../base");
const nodeTemplates_1 = require("../../../utils/nodeTemplates");
const cairoNodes_1 = require("../../../ast/cairoNodes");
const utils_1 = require("../../../utils/utils");
const astPrinter_1 = require("../../../utils/astPrinter");
const nodeTypeProcessing_1 = require("../../../utils/nodeTypeProcessing");
const INDENT = ' '.repeat(4);
class ExternalDynArrayStructConstructor extends base_1.StringIndexedFuncGen {
    gen(astNode, nodeInSourceUnit) {
        const type = (0, solc_typed_ast_1.generalizeType)((0, solc_typed_ast_1.getNodeType)(astNode, this.ast.compilerVersion))[0];
        (0, assert_1.default)((0, nodeTypeProcessing_1.isDynamicArray)(type), `Attempted to create dynArray struct for non-dynarray type ${(0, astPrinter_1.printTypeNode)(type)}`);
        const name = this.getOrCreate(type);
        const structDefStub = (0, functionGeneration_1.createCairoFunctionStub)(name, [['darray', (0, utils_1.typeNameFromTypeNode)(type, this.ast), solc_typed_ast_1.DataLocation.CallData]], [['darray_struct', (0, utils_1.typeNameFromTypeNode)(type, this.ast), solc_typed_ast_1.DataLocation.CallData]], [], this.ast, nodeInSourceUnit ?? astNode, {
            mutability: solc_typed_ast_1.FunctionStateMutability.View,
            stubKind: cairoNodes_1.FunctionStubKind.StructDefStub,
            acceptsRawDArray: true,
        });
        if (astNode instanceof solc_typed_ast_1.VariableDeclaration) {
            const functionInputs = [
                (0, nodeTemplates_1.createIdentifier)(astNode, this.ast, solc_typed_ast_1.DataLocation.CallData),
            ];
            return (0, functionGeneration_1.createCallToFunction)(structDefStub, functionInputs, this.ast);
        }
        else {
            // When CallData DynArrays are being returned and we do not need the StructConstructor to be returned, we just need
            // the StructDefinition to be in the contract.
            return;
        }
    }
    getOrCreate(type) {
        const elemType = (0, nodeTypeProcessing_1.getElementType)(type);
        const elementCairoType = cairoTypeSystem_1.CairoType.fromSol(elemType, this.ast, cairoTypeSystem_1.TypeConversionContext.CallDataRef);
        const key = (0, cairoTypeSystem_1.generateCallDataDynArrayStructName)(elemType, this.ast);
        const existing = this.generatedFunctions.get(key);
        if (existing !== undefined) {
            return existing.name;
        }
        this.generatedFunctions.set(key, {
            name: key,
            code: [
                `struct ${key}:`,
                `${INDENT}member len : felt `,
                `${INDENT}member ptr : ${elementCairoType.toString()}*`,
                `end`,
            ].join('\n'),
        });
        return key;
    }
}
exports.ExternalDynArrayStructConstructor = ExternalDynArrayStructConstructor;
//# sourceMappingURL=externalDynArrayStructConstructor.js.map