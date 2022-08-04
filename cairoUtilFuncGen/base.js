"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.delegateBasedOnType = exports.locationIfComplexType = exports.add = exports.StringIndexedFuncGen = exports.CairoUtilFuncGenBase = void 0;
const assert_1 = __importDefault(require("assert"));
const solc_typed_ast_1 = require("solc-typed-ast");
const errors_1 = require("../utils/errors");
const nodeTypeProcessing_1 = require("../utils/nodeTypeProcessing");
/*
  Base class for all specific cairo function generators
  These exist for cases where a transform we need is too specific to cairo to
  be doable by directly changing the solidity AST, so a stubbed FunctionDefintion
  is created and called in the AST, and a cairo definition for the function is either
  directly added to the output code, or one in warplib is referenced
*/
class CairoUtilFuncGenBase {
    constructor(ast, sourceUnit) {
        this.imports = new Map();
        this.ast = ast;
        this.sourceUnit = sourceUnit;
    }
    // import file -> import symbols
    getImports() {
        return this.imports;
    }
    requireImport(location, name) {
        const existingImports = this.imports.get(location) ?? new Set();
        existingImports.add(name);
        this.imports.set(location, existingImports);
    }
    checkForImport(type) {
        if (type instanceof solc_typed_ast_1.IntType && type.nBits === 256) {
            this.requireImport('starkware.cairo.common.uint256', 'Uint256');
        }
    }
}
exports.CairoUtilFuncGenBase = CairoUtilFuncGenBase;
/*
  Most subclasses of CairoUtilFuncGenBase index their CairoFunctions off a single string,
  usually the cairo type of the input that the function's code depends on
*/
class StringIndexedFuncGen extends CairoUtilFuncGenBase {
    constructor() {
        super(...arguments);
        this.generatedFunctions = new Map();
    }
    getGeneratedCode() {
        return [...this.generatedFunctions.values()].map((func) => func.code).join('\n\n');
    }
}
exports.StringIndexedFuncGen = StringIndexedFuncGen;
// Quick shortcut for writing `${base} + ${offset}` that also shortens it in the case of +0
function add(base, offset) {
    return offset === 0 ? base : `${base} + ${offset}`;
}
exports.add = add;
// This is needed because index access and member access functions return pointers, even if the data
// pointed to is a basic type, whereas read and write functions need to only return pointers if the
// data they're reading or writing is a complex type
function locationIfComplexType(type, location) {
    const base = (0, solc_typed_ast_1.generalizeType)(type)[0];
    if ((0, nodeTypeProcessing_1.isReferenceType)(base)) {
        return location;
    }
    else {
        return solc_typed_ast_1.DataLocation.Default;
    }
}
exports.locationIfComplexType = locationIfComplexType;
function delegateBasedOnType(type, dynamicArrayFunc, staticArrayFunc, structFunc, mappingFunc, valueFunc) {
    if (type instanceof solc_typed_ast_1.PointerType) {
        throw new errors_1.TranspileFailedError(`Attempted to delegate copy semantics based on specialised type ${type.pp()}`);
    }
    else if ((0, nodeTypeProcessing_1.isDynamicArray)(type)) {
        (0, assert_1.default)(type instanceof solc_typed_ast_1.ArrayType || type instanceof solc_typed_ast_1.BytesType || type instanceof solc_typed_ast_1.StringType);
        return dynamicArrayFunc(type);
    }
    else if (type instanceof solc_typed_ast_1.ArrayType) {
        return staticArrayFunc(type);
    }
    else if (type instanceof solc_typed_ast_1.UserDefinedType && type.definition instanceof solc_typed_ast_1.StructDefinition) {
        return structFunc(type, type.definition);
    }
    else if (type instanceof solc_typed_ast_1.MappingType) {
        return mappingFunc(type);
    }
    else {
        return valueFunc(type);
    }
}
exports.delegateBasedOnType = delegateBasedOnType;
//# sourceMappingURL=base.js.map