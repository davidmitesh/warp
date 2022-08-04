"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isStorageSpecificType = exports.getSize = exports.getElementType = exports.checkableType = exports.isMapping = exports.isComplexMemoryType = exports.isDynamicStorageArray = exports.isValueType = exports.isReferenceType = exports.isStruct = exports.isDynamicCallDataArray = exports.isDynamicArray = exports.intTypeForLiteral = exports.specializeType = exports.typeNameToSpecializedTypeNode = exports.getParameterTypes = void 0;
const assert_1 = __importDefault(require("assert"));
const solc_typed_ast_1 = require("solc-typed-ast");
const astPrinter_1 = require("./astPrinter");
const errors_1 = require("./errors");
const formatting_1 = require("./formatting");
/*
Normal function calls and struct constructors require different methods for
getting the expected types of their arguments, this centralises that process
Does not handle type conversion functions, as they don't have a specific input type
*/
function getParameterTypes(functionCall, ast) {
    const functionType = (0, solc_typed_ast_1.getNodeType)(functionCall.vExpression, ast.compilerVersion);
    switch (functionCall.kind) {
        case solc_typed_ast_1.FunctionCallKind.FunctionCall:
            (0, assert_1.default)(functionType instanceof solc_typed_ast_1.FunctionType, `Expected ${(0, astPrinter_1.printNode)(functionCall.vExpression)} to be FunctionType, got ${(0, astPrinter_1.printTypeNode)(functionType)}`);
            return functionType.parameters;
        case solc_typed_ast_1.FunctionCallKind.StructConstructorCall: {
            (0, assert_1.default)(functionType instanceof solc_typed_ast_1.TypeNameType &&
                functionType.type instanceof solc_typed_ast_1.PointerType &&
                functionType.type.to instanceof solc_typed_ast_1.UserDefinedType, (0, formatting_1.error)(`TypeNode for ${(0, astPrinter_1.printNode)(functionCall.vExpression)} was expected to be a TypeNameType(PointerType(UserDefinedType, _)), got ${(0, astPrinter_1.printTypeNode)(functionType, true)}`));
            const structDef = functionType.type.to.definition;
            (0, assert_1.default)(structDef instanceof solc_typed_ast_1.StructDefinition);
            return structDef.vMembers.map(solc_typed_ast_1.variableDeclarationToTypeNode);
        }
        case solc_typed_ast_1.FunctionCallKind.TypeConversion:
            throw new errors_1.TranspileFailedError(`Cannot determine specific expected input type to type conversion function ${(0, astPrinter_1.printNode)(functionCall)}`);
    }
}
exports.getParameterTypes = getParameterTypes;
function typeNameToSpecializedTypeNode(typeName, loc) {
    return specializeType((0, solc_typed_ast_1.typeNameToTypeNode)(typeName), loc);
}
exports.typeNameToSpecializedTypeNode = typeNameToSpecializedTypeNode;
function specializeType(typeNode, loc) {
    if (typeNode instanceof solc_typed_ast_1.PointerType) {
        (0, assert_1.default)(typeNode.location === loc, `Attempting to specialize ${typeNode.location} pointer type to ${loc}\nType:${(0, astPrinter_1.printTypeNode)(typeNode, true)}`);
        return typeNode;
    }
    (0, assert_1.default)(!(typeNode instanceof solc_typed_ast_1.TupleType), 'Unexpected tuple type ${printTypeNode(typeNode)} in concretization.');
    if (typeNode instanceof solc_typed_ast_1.PackedArrayType) {
        return new solc_typed_ast_1.PointerType(typeNode, loc);
    }
    if (typeNode instanceof solc_typed_ast_1.ArrayType) {
        const concreteElT = specializeType(typeNode.elementT, loc);
        return new solc_typed_ast_1.PointerType(new solc_typed_ast_1.ArrayType(concreteElT, typeNode.size), loc);
    }
    if (typeNode instanceof solc_typed_ast_1.UserDefinedType) {
        const def = typeNode.definition;
        (0, assert_1.default)(def !== undefined, `Can't concretize user defined type ${(0, astPrinter_1.printTypeNode)(typeNode)} with no corresponding definition.`);
        if (def instanceof solc_typed_ast_1.StructDefinition) {
            return new solc_typed_ast_1.PointerType(typeNode, loc);
        }
        // Enums and contracts are value types
        return typeNode;
    }
    if (typeNode instanceof solc_typed_ast_1.MappingType) {
        // Always treat map keys as in-memory copies
        const concreteKeyT = specializeType(typeNode.keyType, solc_typed_ast_1.DataLocation.Memory);
        // The result of map indexing is always a pointer to a value that lives in storage
        const concreteValueT = specializeType(typeNode.valueType, solc_typed_ast_1.DataLocation.Storage);
        // Maps always live in storage
        return new solc_typed_ast_1.PointerType(new solc_typed_ast_1.MappingType(concreteKeyT, concreteValueT), solc_typed_ast_1.DataLocation.Storage);
    }
    // Note string literals are a special case where the location cannot be known by a function like this
    // We insert conversions around string literals based on how they are being used in implicitConversionToExplicit
    return typeNode;
}
exports.specializeType = specializeType;
function intTypeForLiteral(typestring) {
    (0, assert_1.default)(typestring.startsWith('int_const '), `Expected int literal typestring to start with "int_const ". Got ${typestring}`);
    const value = BigInt(typestring.slice('int_const '.length));
    if (value >= 0) {
        const binaryLength = value.toString(2).length;
        const width = 8 * Math.ceil(binaryLength / 8);
        return new solc_typed_ast_1.IntType(width, false);
    }
    else {
        // This is not the exact binary length in all cases, but it puts the values into the correct 8bit range
        const binaryLength = (-value - 1n).toString(2).length + 1;
        const width = 8 * Math.ceil(binaryLength / 8);
        return new solc_typed_ast_1.IntType(width, true);
    }
}
exports.intTypeForLiteral = intTypeForLiteral;
function isDynamicArray(type) {
    return ((type instanceof solc_typed_ast_1.PointerType && isDynamicArray(type.to)) ||
        (type instanceof solc_typed_ast_1.ArrayType && type.size === undefined) ||
        type instanceof solc_typed_ast_1.BytesType ||
        type instanceof solc_typed_ast_1.StringType);
}
exports.isDynamicArray = isDynamicArray;
function isDynamicCallDataArray(type) {
    return (type instanceof solc_typed_ast_1.PointerType &&
        type.location === solc_typed_ast_1.DataLocation.CallData &&
        isDynamicArray(type.to));
}
exports.isDynamicCallDataArray = isDynamicCallDataArray;
function isStruct(type) {
    return ((type instanceof solc_typed_ast_1.UserDefinedType && type.definition instanceof solc_typed_ast_1.StructDefinition) ||
        (type instanceof solc_typed_ast_1.PointerType && isStruct(type.to)));
}
exports.isStruct = isStruct;
function isReferenceType(type) {
    return (type instanceof solc_typed_ast_1.ArrayType ||
        type instanceof solc_typed_ast_1.BytesType ||
        type instanceof solc_typed_ast_1.MappingType ||
        type instanceof solc_typed_ast_1.StringType ||
        (type instanceof solc_typed_ast_1.UserDefinedType && type.definition instanceof solc_typed_ast_1.StructDefinition) ||
        (type instanceof solc_typed_ast_1.PointerType && isReferenceType(type.to)));
}
exports.isReferenceType = isReferenceType;
function isValueType(type) {
    return !isReferenceType(type);
}
exports.isValueType = isValueType;
function isDynamicStorageArray(type) {
    return (type instanceof solc_typed_ast_1.PointerType && type.location === solc_typed_ast_1.DataLocation.Storage && isDynamicArray(type.to));
}
exports.isDynamicStorageArray = isDynamicStorageArray;
function isComplexMemoryType(type) {
    return (type instanceof solc_typed_ast_1.PointerType && type.location === solc_typed_ast_1.DataLocation.Memory && isReferenceType(type.to));
}
exports.isComplexMemoryType = isComplexMemoryType;
function isMapping(type) {
    const [base] = (0, solc_typed_ast_1.generalizeType)(type);
    return base instanceof solc_typed_ast_1.MappingType;
}
exports.isMapping = isMapping;
function checkableType(type) {
    return (type instanceof solc_typed_ast_1.ArrayType ||
        type instanceof solc_typed_ast_1.BytesType ||
        type instanceof solc_typed_ast_1.FixedBytesType ||
        (type instanceof solc_typed_ast_1.UserDefinedType &&
            (type.definition instanceof solc_typed_ast_1.StructDefinition || type.definition instanceof solc_typed_ast_1.EnumDefinition)) ||
        type instanceof solc_typed_ast_1.AddressType ||
        type instanceof solc_typed_ast_1.IntType ||
        type instanceof solc_typed_ast_1.BoolType ||
        type instanceof solc_typed_ast_1.StringType);
}
exports.checkableType = checkableType;
function getElementType(type) {
    if (type instanceof solc_typed_ast_1.ArrayType) {
        return type.elementT;
    }
    else {
        return new solc_typed_ast_1.FixedBytesType(1);
    }
}
exports.getElementType = getElementType;
function getSize(type) {
    if (type instanceof solc_typed_ast_1.ArrayType) {
        return type.size;
    }
    else {
        return undefined;
    }
}
exports.getSize = getSize;
function isStorageSpecificType(type, ast, visitedStructs = []) {
    if (type instanceof solc_typed_ast_1.MappingType)
        return true;
    if (type instanceof solc_typed_ast_1.PointerType)
        return isStorageSpecificType(type.to, ast, visitedStructs);
    if (type instanceof solc_typed_ast_1.ArrayType)
        return isStorageSpecificType(type.elementT, ast, visitedStructs);
    if (type instanceof solc_typed_ast_1.UserDefinedType &&
        type.definition instanceof solc_typed_ast_1.StructDefinition &&
        !visitedStructs.includes(type.definition.id)) {
        visitedStructs.push(type.definition.id);
        return type.definition.vMembers.some((m) => isStorageSpecificType((0, solc_typed_ast_1.getNodeType)(m, ast.compilerVersion), ast, visitedStructs));
    }
    return false;
}
exports.isStorageSpecificType = isStorageSpecificType;
//# sourceMappingURL=nodeTypeProcessing.js.map