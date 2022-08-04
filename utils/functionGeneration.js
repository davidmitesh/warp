"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.collectUnboundVariables = exports.createOuterCall = exports.fixParameterScopes = exports.createElementaryConversionCall = exports.createCairoFunctionStub = exports.createCallToEvent = exports.createCallToFunction = void 0;
const solc_typed_ast_1 = require("solc-typed-ast");
const cairoNodes_1 = require("../ast/cairoNodes");
const getTypeString_1 = require("./getTypeString");
const nodeTemplates_1 = require("./nodeTemplates");
const nodeTypeProcessing_1 = require("./nodeTypeProcessing");
const utils_1 = require("./utils");
function createCallToFunction(functionDef, argList, ast, nodeInSourceUnit) {
    return new solc_typed_ast_1.FunctionCall(ast.reserveId(), '', (0, getTypeString_1.getReturnTypeString)(functionDef, ast, nodeInSourceUnit), solc_typed_ast_1.FunctionCallKind.FunctionCall, new solc_typed_ast_1.Identifier(ast.reserveId(), '', (0, getTypeString_1.getFunctionTypeString)(functionDef, ast.compilerVersion, nodeInSourceUnit), functionDef.name, functionDef.id), argList);
}
exports.createCallToFunction = createCallToFunction;
function createCallToEvent(eventDef, identifierTypeString, argList, ast) {
    return new solc_typed_ast_1.FunctionCall(ast.reserveId(), '', 'tuple()', solc_typed_ast_1.FunctionCallKind.FunctionCall, new solc_typed_ast_1.Identifier(ast.reserveId(), '', identifierTypeString, eventDef.name, eventDef.id), argList);
}
exports.createCallToEvent = createCallToEvent;
function createCairoFunctionStub(name, inputs, returns, implicits, ast, nodeInSourceUnit, options = {
    mutability: solc_typed_ast_1.FunctionStateMutability.NonPayable,
    stubKind: cairoNodes_1.FunctionStubKind.FunctionDefStub,
    acceptsRawDArray: false,
    acceptsUnpackedStructArray: false,
}) {
    const sourceUnit = ast.getContainingRoot(nodeInSourceUnit);
    const funcDefId = ast.reserveId();
    const createParameters = (inputs) => inputs.map(([name, type, location]) => new solc_typed_ast_1.VariableDeclaration(ast.reserveId(), '', false, false, name, funcDefId, false, location ?? solc_typed_ast_1.DataLocation.Default, solc_typed_ast_1.StateVariableVisibility.Private, solc_typed_ast_1.Mutability.Mutable, type.typeString, undefined, type));
    const funcDef = new cairoNodes_1.CairoFunctionDefinition(funcDefId, '', sourceUnit.id, solc_typed_ast_1.FunctionKind.Function, name, false, solc_typed_ast_1.FunctionVisibility.Private, options.mutability ?? solc_typed_ast_1.FunctionStateMutability.NonPayable, false, (0, nodeTemplates_1.createParameterList)(createParameters(inputs), ast), (0, nodeTemplates_1.createParameterList)(createParameters(returns), ast), [], new Set(implicits), options.stubKind ?? cairoNodes_1.FunctionStubKind.FunctionDefStub, options.acceptsRawDArray ?? false, options.acceptsUnpackedStructArray ?? false);
    ast.setContextRecursive(funcDef);
    sourceUnit.insertAtBeginning(funcDef);
    return funcDef;
}
exports.createCairoFunctionStub = createCairoFunctionStub;
function createElementaryConversionCall(typeTo, expression, ast) {
    const isDynArray = (0, nodeTypeProcessing_1.isDynamicArray)((0, solc_typed_ast_1.getNodeType)(typeTo, ast.compilerVersion));
    const innerTypeString = isDynArray
        ? `type(${typeTo.typeString} storage pointer)`
        : `type(${typeTo.typeString})`;
    const outerTypeString = isDynArray ? `${typeTo.typeString} memory` : typeTo.typeString;
    const node = new solc_typed_ast_1.FunctionCall(ast.reserveId(), '', outerTypeString, solc_typed_ast_1.FunctionCallKind.TypeConversion, new solc_typed_ast_1.ElementaryTypeNameExpression(ast.reserveId(), '', innerTypeString, typeTo), [expression]);
    ast.setContextRecursive(node);
    return node;
}
exports.createElementaryConversionCall = createElementaryConversionCall;
function fixParameterScopes(node) {
    [...node.vParameters.vParameters, ...node.vReturnParameters.vParameters].forEach((decl) => (decl.scope = node.id));
}
exports.fixParameterScopes = fixParameterScopes;
function createOuterCall(node, variables, functionToCall, ast) {
    const resultIdentifiers = variables.map((k) => (0, nodeTemplates_1.createIdentifier)(k, ast));
    const assignmentValue = (0, utils_1.toSingleExpression)(resultIdentifiers, ast);
    return new solc_typed_ast_1.ExpressionStatement(ast.reserveId(), node.src, resultIdentifiers.length === 0
        ? functionToCall
        : new solc_typed_ast_1.Assignment(ast.reserveId(), '', assignmentValue.typeString, '=', assignmentValue, functionToCall), undefined, node.raw);
}
exports.createOuterCall = createOuterCall;
function collectUnboundVariables(node) {
    const internalDeclarations = node
        .getChildren(true)
        .filter((n) => n instanceof solc_typed_ast_1.VariableDeclaration);
    const unboundVariables = node
        .getChildren(true)
        .filter((n) => n instanceof solc_typed_ast_1.Identifier)
        .map((id) => [id, id.vReferencedDeclaration])
        .filter((pair) => pair[1] !== undefined &&
        pair[1] instanceof solc_typed_ast_1.VariableDeclaration &&
        !internalDeclarations.includes(pair[1]));
    const retMap = new Map();
    unboundVariables.forEach(([id, decl]) => {
        const existingEntry = retMap.get(decl);
        if (existingEntry === undefined) {
            retMap.set(decl, [id]);
        }
        else {
            retMap.set(decl, [id, ...existingEntry]);
        }
    });
    return retMap;
}
exports.collectUnboundVariables = collectUnboundVariables;
//# sourceMappingURL=functionGeneration.js.map