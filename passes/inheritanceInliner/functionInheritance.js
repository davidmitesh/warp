"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addNonoverridenPublicFunctions = exports.addPrivateSuperFunctions = void 0;
const assert_1 = __importDefault(require("assert"));
const solc_typed_ast_1 = require("solc-typed-ast");
const astPrinter_1 = require("../../utils/astPrinter");
const cloning_1 = require("../../utils/cloning");
const errors_1 = require("../../utils/errors");
const functionGeneration_1 = require("../../utils/functionGeneration");
const nodeTemplates_1 = require("../../utils/nodeTemplates");
const utils_1 = require("../../utils/utils");
const utils_2 = require("./utils");
// Every function from every base contract gets included privately in the derived contract
// To prevent name collisions, these functions have "_sX" appended
function addPrivateSuperFunctions(node, idRemapping, idRemappingOverriders, ast) {
    const currentFunctions = new Map();
    // collect functions in the current contract
    node.vFunctions.forEach((f) => currentFunctions.set(f.name, f));
    (0, utils_2.getBaseContracts)(node).forEach((base, depth) => {
        base.vFunctions
            .filter((func) => func.kind === solc_typed_ast_1.FunctionKind.Function &&
            (node.kind === solc_typed_ast_1.ContractKind.Interface ? (0, utils_1.isExternallyVisible)(func) : true))
            .map((func) => {
            const existingEntry = currentFunctions.get(func.name);
            const clonedFunction = (0, cloning_1.cloneASTNode)(func, ast);
            idRemapping.set(func.id, clonedFunction);
            clonedFunction.name = `s${depth + 1}_${clonedFunction.name}`;
            clonedFunction.visibility = solc_typed_ast_1.FunctionVisibility.Private;
            clonedFunction.scope = node.id;
            if (existingEntry !== undefined) {
                idRemappingOverriders.set(func.id, existingEntry);
            }
            else {
                currentFunctions.set(func.name, clonedFunction);
                idRemappingOverriders.set(func.id, clonedFunction);
                //Add recursion here for recursive function calls
                idRemappingOverriders.set(clonedFunction.id, clonedFunction);
            }
            return clonedFunction;
        })
            .forEach((func) => {
            node.appendChild(func);
            (0, utils_2.fixSuperReference)(func, base, node);
        });
    });
}
exports.addPrivateSuperFunctions = addPrivateSuperFunctions;
// Add inherited public/external functions
function addNonoverridenPublicFunctions(node, idRemapping, ast) {
    // First, find all function names that should be callable from outside the derived contract
    const visibleFunctionNames = squashInterface(node);
    // Next, resolve these names to the FunctionDefinition nodes that should actually get called
    // This means searching back through the inheritance chain to find the first match
    const resolvedVisibleFunctions = [...visibleFunctionNames].map((name) => resolveFunctionName(node, name));
    // Only functions that are defined only in base contracts need to get moved
    const functionsToMove = resolvedVisibleFunctions.filter((func) => func.vScope !== node);
    // All the functions from the inheritance chain have already been copied into this contract as private functions
    // So to make them accessible with the expected name, new public or external functions are created that call the private one
    functionsToMove.forEach((f) => {
        const privateFunc = idRemapping.get(f.id);
        (0, assert_1.default)(privateFunc !== undefined, `Unable to find inlined base function for ${(0, astPrinter_1.printNode)(f)} in ${node.name}`);
        node.appendChild(createDelegatingFunction(f, privateFunc, node.id, ast));
    });
    // Special functions (fallback, receive) have an empty name and don't have their respective private duplicate,
    // therefore they need to be handled separately
    findSpecialFunction(node, solc_typed_ast_1.FunctionKind.Fallback, ast);
    findSpecialFunction(node, solc_typed_ast_1.FunctionKind.Receive, ast);
}
exports.addNonoverridenPublicFunctions = addNonoverridenPublicFunctions;
// Get all visible function names accessible from a contract
function getVisibleFunctions(node) {
    const visibleFunctions = new Set(node.vFunctions
        .filter((func) => (0, utils_1.isExternallyVisible)(func) && func.kind === solc_typed_ast_1.FunctionKind.Function)
        .map((func) => func.name));
    return visibleFunctions;
}
function squashInterface(node) {
    const visibleFunctions = getVisibleFunctions(node);
    (0, utils_2.getBaseContracts)(node).forEach((contract) => {
        // The public interfaces of a library are not exposed by the contract itself
        if (contract.kind === solc_typed_ast_1.ContractKind.Library)
            return;
        const inheritedVisibleFunctions = getVisibleFunctions(contract);
        inheritedVisibleFunctions.forEach((f) => visibleFunctions.add(f));
    });
    return visibleFunctions;
}
function findFunctionName(node, functionName) {
    const matches = node.vFunctions.filter((f) => f.name === functionName);
    if (matches.length > 1) {
        throw new errors_1.TranspileFailedError(`InheritanceInliner expects unique function names, was IdentifierManger run? Found multiple ${functionName} in ${(0, astPrinter_1.printNode)(node)} ${node.name}`);
    }
    else if (matches.length === 1) {
        return matches[0];
    }
    else
        return undefined;
}
function resolveFunctionName(node, functionName) {
    let matches = findFunctionName(node, functionName);
    if (matches !== undefined)
        return matches;
    for (const base of (0, utils_2.getBaseContracts)(node)) {
        matches = findFunctionName(base, functionName);
        if (matches !== undefined)
            return matches;
    }
    throw new errors_1.TranspileFailedError(`Failed to find ${functionName} in ${(0, astPrinter_1.printNode)(node)} ${node.name}`);
}
function createDelegatingFunction(funcToCopy, delegate, scope, ast) {
    (0, assert_1.default)(funcToCopy.kind === solc_typed_ast_1.FunctionKind.Function, `Attempted to copy non-member function ${funcToCopy.name}`);
    (0, assert_1.default)((0, utils_1.isExternallyVisible)(funcToCopy), `Attempted to copy non public/external function ${funcToCopy.name}`);
    const oldBody = funcToCopy.vBody;
    funcToCopy.vBody = undefined;
    const newFunc = (0, cloning_1.cloneASTNode)(funcToCopy, ast);
    funcToCopy.vBody = oldBody;
    const newBody = (0, nodeTemplates_1.createBlock)([
        (0, nodeTemplates_1.createReturn)((0, functionGeneration_1.createCallToFunction)(delegate, newFunc.vParameters.vParameters.map((v) => (0, nodeTemplates_1.createIdentifier)(v, ast, undefined, funcToCopy)), ast), newFunc.vReturnParameters.id, ast),
    ], ast);
    newFunc.scope = scope;
    newFunc.vOverrideSpecifier = undefined;
    newFunc.vBody = newBody;
    newFunc.acceptChildren();
    ast.setContextRecursive(newFunc);
    return newFunc;
}
function findSpecialFunction(node, kind, ast) {
    for (const contract of node.vLinearizedBaseContracts) {
        for (const func of contract.vFunctions) {
            if (func.kind === kind) {
                if (func.vScope !== node) {
                    const newFunc = (0, cloning_1.cloneASTNode)(func, ast);
                    newFunc.scope = node.id;
                    newFunc.vOverrideSpecifier = undefined;
                    node.appendChild(newFunc);
                }
                return;
            }
        }
    }
}
//# sourceMappingURL=functionInheritance.js.map