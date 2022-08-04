"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLoopCall = exports.extractDoWhileToFunction = exports.extractWhileToFunction = void 0;
const assert_1 = __importDefault(require("assert"));
const solc_typed_ast_1 = require("solc-typed-ast");
const astPrinter_1 = require("../../utils/astPrinter");
const cloning_1 = require("../../utils/cloning");
const functionGeneration_1 = require("../../utils/functionGeneration");
const nameModifiers_1 = require("../../utils/nameModifiers");
const nodeTemplates_1 = require("../../utils/nodeTemplates");
// It's okay to use a global counter here as it only affects private functions
// and never anything that can be referenced from another file
let loopFnCounter = 0;
function extractWhileToFunction(node, variables, loopToContinueFunction, ast, prefix = nameModifiers_1.WHILE_PREFIX) {
    const scope = node.getClosestParentByType(solc_typed_ast_1.ContractDefinition) ??
        node.getClosestParentByType(solc_typed_ast_1.SourceUnit);
    (0, assert_1.default)(scope !== undefined, `Couldn't find ${(0, astPrinter_1.printNode)(node)}'s function target root`);
    // Create input parameters and keep the new referencing number in variablesRemapping
    // for later fixing
    const variablesRemapping = new Map();
    const inputParams = variables.map((v) => {
        const param = (0, cloning_1.cloneASTNode)(v, ast);
        variablesRemapping.set(v.id, param);
        return param;
    });
    const retParams = (0, nodeTemplates_1.createParameterList)(variables.map((v) => (0, cloning_1.cloneASTNode)(v, ast)), ast);
    const defId = ast.reserveId();
    const defName = `${prefix}${loopFnCounter++}`;
    const funcBody = (0, nodeTemplates_1.createBlock)([createStartingIf(node.vCondition, node.vBody, variables, retParams.id, ast)], ast);
    // Fixing references of identifiers to the new input variables
    funcBody
        .getChildren(true)
        .filter((n) => n instanceof solc_typed_ast_1.Identifier && variablesRemapping.get(n.referencedDeclaration) !== undefined)
        .forEach((id) => {
        const newDecl = variablesRemapping.get(id.referencedDeclaration);
        (0, assert_1.default)(newDecl !== undefined, 'There should be a variable declaration');
        id.referencedDeclaration = newDecl.id;
    });
    const funcDef = new solc_typed_ast_1.FunctionDefinition(defId, node.src, scope.id, scope instanceof solc_typed_ast_1.SourceUnit ? solc_typed_ast_1.FunctionKind.Free : solc_typed_ast_1.FunctionKind.Function, defName, false, solc_typed_ast_1.FunctionVisibility.Private, solc_typed_ast_1.FunctionStateMutability.NonPayable, false, (0, nodeTemplates_1.createParameterList)(inputParams, ast), retParams, [], undefined, funcBody);
    (0, functionGeneration_1.fixParameterScopes)(funcDef);
    loopToContinueFunction.set(defId, funcDef);
    scope.insertAtBeginning(funcDef);
    ast.registerChild(funcDef, scope);
    ast.insertStatementAfter(funcBody, (0, nodeTemplates_1.createReturn)(createLoopCall(funcDef, inputParams, ast), funcDef.vReturnParameters.id, ast));
    return funcDef;
}
exports.extractWhileToFunction = extractWhileToFunction;
function extractDoWhileToFunction(node, variables, loopToContinueFunction, ast) {
    const doWhileFuncDef = extractWhileToFunction(node, variables, loopToContinueFunction, ast, '__warp_do_while_');
    const doBlockDefName = `__warp_do_${loopFnCounter++}`;
    const doBlockRetParams = (0, nodeTemplates_1.createParameterList)(variables.map((v) => (0, cloning_1.cloneASTNode)(v, ast)), ast);
    const doBlockFuncId = ast.reserveId();
    // Create input parameters and keep the new referencing number in variablesRemapping
    // for later fixing
    const variablesRemapping = new Map();
    const doBlockParams = variables.map((v) => {
        const param = (0, cloning_1.cloneASTNode)(v, ast);
        variablesRemapping.set(v.id, param);
        return param;
    });
    const doBlockBody = (0, nodeTemplates_1.createBlock)([
        (0, cloning_1.cloneASTNode)(node.vBody, ast),
        (0, nodeTemplates_1.createReturn)(createLoopCall(doWhileFuncDef, variables, ast), doBlockRetParams.id, ast),
    ], ast);
    // Fixing references of identifiers to the new input variables
    doBlockBody
        .getChildren(true)
        .filter((n) => n instanceof solc_typed_ast_1.Identifier && variablesRemapping.get(n.referencedDeclaration) !== undefined)
        .forEach((id) => {
        const newDecl = variablesRemapping.get(id.referencedDeclaration);
        (0, assert_1.default)(newDecl !== undefined, 'There should be a variable declaration');
        id.referencedDeclaration = newDecl.id;
    });
    const doBlockFuncDef = new solc_typed_ast_1.FunctionDefinition(doBlockFuncId, node.src, doWhileFuncDef.scope, doWhileFuncDef.kind, doBlockDefName, false, solc_typed_ast_1.FunctionVisibility.Private, solc_typed_ast_1.FunctionStateMutability.NonPayable, false, (0, nodeTemplates_1.createParameterList)(doBlockParams, ast), doBlockRetParams, [], undefined, doBlockBody);
    (0, functionGeneration_1.fixParameterScopes)(doBlockFuncDef);
    doWhileFuncDef.vScope.insertAtBeginning(doBlockFuncDef);
    ast.registerChild(doBlockFuncDef, doWhileFuncDef.vScope);
    loopToContinueFunction.set(doBlockFuncId, doWhileFuncDef);
    return doBlockFuncDef;
}
exports.extractDoWhileToFunction = extractDoWhileToFunction;
function createStartingIf(condition, body, variables, retParamsId, ast) {
    return new solc_typed_ast_1.IfStatement(ast.reserveId(), '', (0, cloning_1.cloneASTNode)(condition, ast), (0, cloning_1.cloneASTNode)(body, ast), (0, nodeTemplates_1.createReturn)(variables, retParamsId, ast));
}
function createLoopCall(loopFunction, variables, ast) {
    return (0, functionGeneration_1.createCallToFunction)(loopFunction, variables.map((v) => (0, nodeTemplates_1.createIdentifier)(v, ast)), ast);
}
exports.createLoopCall = createLoopCall;
//# sourceMappingURL=utils.js.map