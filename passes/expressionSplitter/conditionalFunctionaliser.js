"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNodeVariables = exports.addStatementsToCallFunction = exports.createReturnBody = exports.createFunctionBody = exports.getParams = exports.getInputs = exports.getContainingFunction = exports.getConditionalReturnVariable = exports.getReturns = void 0;
const assert = require("assert");
const solc_typed_ast_1 = require("solc-typed-ast");
const astPrinter_1 = require("../../utils/astPrinter");
const cloning_1 = require("../../utils/cloning");
const defaultValueNodes_1 = require("../../utils/defaultValueNodes");
const functionGeneration_1 = require("../../utils/functionGeneration");
const nodeTemplates_1 = require("../../utils/nodeTemplates");
// The returns should be both the values returned by the conditional itself,
// as well as the variables that got captured, as they could have been modified
function getReturns(node, variables, funcId, varId, ast) {
    const capturedVars = [...variables].map(([decl]) => (0, cloning_1.cloneASTNode)(decl, ast));
    const retVariable = getConditionalReturnVariable(node, funcId, varId, ast);
    return (0, nodeTemplates_1.createParameterList)([retVariable, ...capturedVars], ast);
}
exports.getReturns = getReturns;
function getConditionalReturnVariable(node, funcId, id, ast) {
    return new solc_typed_ast_1.VariableDeclaration(ast.reserveId(), '', false, false, `ret_conditional${id}`, funcId, false, solc_typed_ast_1.DataLocation.Default, solc_typed_ast_1.StateVariableVisibility.Private, solc_typed_ast_1.Mutability.Mutable, node.typeString);
}
exports.getConditionalReturnVariable = getConditionalReturnVariable;
function getContainingFunction(node) {
    const func = node.getClosestParentByType(solc_typed_ast_1.FunctionDefinition);
    assert(func !== undefined, `Unable to find containing function for ${(0, astPrinter_1.printNode)(node)}`);
    return func;
}
exports.getContainingFunction = getContainingFunction;
// The inputs to the function should be only the free variables
// The branches get inlined into the function so that only the taken
// branch gets executed
function getInputs(variables, ast) {
    return [...variables].map(([decl]) => (0, nodeTemplates_1.createIdentifier)(decl, ast));
}
exports.getInputs = getInputs;
// The parameters should be the same as the inputs
// However this must also create new variable declarations for
// use in the new function, and rebind internal identifiers
// to these new variables
function getParams(variables, ast) {
    return (0, nodeTemplates_1.createParameterList)([...variables].map(([decl, ids]) => {
        const newVar = (0, cloning_1.cloneASTNode)(decl, ast);
        ids.forEach((id) => (id.referencedDeclaration = newVar.id));
        return newVar;
    }), ast);
}
exports.getParams = getParams;
function createFunctionBody(node, returns, ast) {
    return (0, nodeTemplates_1.createBlock)([
        new solc_typed_ast_1.IfStatement(ast.reserveId(), '', node.vCondition, createReturnBody(returns, node.vTrueExpression, ast, node), createReturnBody(returns, node.vFalseExpression, ast, node)),
    ], ast);
}
exports.createFunctionBody = createFunctionBody;
function createReturnBody(returns, value, ast, lookupNode) {
    const firstVar = returns.vParameters[0];
    return (0, nodeTemplates_1.createBlock)([
        new solc_typed_ast_1.ExpressionStatement(ast.reserveId(), '', new solc_typed_ast_1.Assignment(ast.reserveId(), '', firstVar.typeString, '=', (0, nodeTemplates_1.createIdentifier)(firstVar, ast, undefined, lookupNode), value)),
        (0, nodeTemplates_1.createReturn)(returns.vParameters, returns.id, ast, lookupNode),
    ], ast);
}
exports.createReturnBody = createReturnBody;
function addStatementsToCallFunction(node, conditionalResult, variables, funcToCall, ast) {
    const statements = [
        new solc_typed_ast_1.VariableDeclarationStatement(ast.reserveId(), '', [conditionalResult.id], [conditionalResult], (0, defaultValueNodes_1.getDefaultValue)((0, solc_typed_ast_1.getNodeType)(conditionalResult, ast.compilerVersion), conditionalResult, ast)),
        (0, functionGeneration_1.createOuterCall)(node, [conditionalResult, ...variables], funcToCall, ast),
    ];
    statements.forEach((stmt) => ast.insertStatementBefore(node, stmt));
}
exports.addStatementsToCallFunction = addStatementsToCallFunction;
function getNodeVariables(node) {
    return new Map([...(0, functionGeneration_1.collectUnboundVariables)(node)].filter(([decl]) => !decl.stateVariable));
}
exports.getNodeVariables = getNodeVariables;
//# sourceMappingURL=conditionalFunctionaliser.js.map