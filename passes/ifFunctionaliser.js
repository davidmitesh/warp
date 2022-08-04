"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IfFunctionaliser = void 0;
const assert_1 = __importDefault(require("assert"));
const solc_typed_ast_1 = require("solc-typed-ast");
const mapper_1 = require("../ast/mapper");
const astPrinter_1 = require("../utils/astPrinter");
const cloning_1 = require("../utils/cloning");
const formatting_1 = require("../utils/formatting");
const functionGeneration_1 = require("../utils/functionGeneration");
const nameModifiers_1 = require("../utils/nameModifiers");
const nodeTemplates_1 = require("../utils/nodeTemplates");
class IfFunctionaliser extends mapper_1.ASTMapper {
    constructor() {
        super(...arguments);
        this.generatedFunctionCount = new Map();
    }
    // Function to add passes that should have been run before this pass
    addInitialPassPrerequisites() {
        const passKeys = new Set([]);
        passKeys.forEach((key) => this.addPassPrerequisite(key));
    }
    visitIfStatement(node, ast) {
        ensureBothBranchesAreBlocks(node, ast);
        const block = getContainingBlock(node);
        const postIfStatements = splitBlock(block, node, ast);
        if (postIfStatements.children.length === 0) {
            this.visitStatement(node, ast);
            return;
        }
        const originalFunction = getContainingFunction(node);
        const [funcDef, funcCall] = createSplitFunction(originalFunction, postIfStatements, this.generatedFunctionCount.get(originalFunction) ?? 0, ast);
        this.generatedFunctionCount.set(originalFunction, (this.generatedFunctionCount.get(originalFunction) ?? 0) + 1);
        addSplitFunctionToScope(originalFunction, funcDef, ast);
        addCallsToSplitFunction(node, originalFunction, funcCall, ast);
        this.visitStatement(node, ast);
    }
}
exports.IfFunctionaliser = IfFunctionaliser;
function getContainingBlock(node) {
    const outerIf = node.getClosestParentByType(solc_typed_ast_1.IfStatement);
    if (outerIf !== undefined) {
        let block;
        if (outerIf.vTrueBody.getChildren(true).includes(node)) {
            block = outerIf.vTrueBody;
        }
        else {
            (0, assert_1.default)(outerIf.vFalseBody !== undefined);
            block = outerIf.vFalseBody;
        }
        (0, assert_1.default)(block instanceof solc_typed_ast_1.Block || block instanceof solc_typed_ast_1.UncheckedBlock, `Attempted to functionalise inner if ${(0, astPrinter_1.printNode)(node)} without wrapping. Expected block/unchecked block, got ${(0, astPrinter_1.printNode)(block)}`);
        return block;
    }
    const containingFunction = getContainingFunction(node);
    (0, assert_1.default)(containingFunction.vBody !== undefined, (0, formatting_1.error)(`Unable to find parent of ${(0, astPrinter_1.printNode)(node)}`));
    return containingFunction.vBody;
}
function getContainingFunction(node) {
    const func = node.getClosestParentByType(solc_typed_ast_1.FunctionDefinition);
    (0, assert_1.default)(func !== undefined, `Unable to find containing function for ${(0, astPrinter_1.printNode)(node)}`);
    return func;
}
function splitBlock(block, split, ast) {
    const res = splitBlockImpl(block, split, ast);
    (0, assert_1.default)(res !== null, `Attempted to split ${(0, astPrinter_1.printNode)(block)} around ${(0, astPrinter_1.printNode)(split)}, which is not a child`);
    return res;
}
function splitBlockImpl(block, split, ast) {
    const splitIndex = block
        .getChildren()
        .findIndex((statement) => statement.getChildren(true).includes(split));
    if (splitIndex === -1)
        return null;
    const newBlock = block instanceof solc_typed_ast_1.UncheckedBlock
        ? new solc_typed_ast_1.UncheckedBlock(ast.reserveId(), '', [])
        : (0, nodeTemplates_1.createBlock)([], ast);
    (0, assert_1.default)(newBlock instanceof block.constructor && block instanceof newBlock.constructor, `Encountered unexpected block subclass ${block.constructor.name} when splitting`);
    let foundSplitPoint = false;
    const statementsToExtract = [];
    block.children.forEach((child) => {
        if (foundSplitPoint) {
            (0, assert_1.default)(child instanceof solc_typed_ast_1.StatementWithChildren || child instanceof solc_typed_ast_1.Statement, `Found non-statement ${(0, astPrinter_1.printNode)(child)} as child of ${(0, astPrinter_1.printNode)(block)}`);
            statementsToExtract.push(child);
        }
        else if (child === split) {
            foundSplitPoint = true;
        }
        else if (child.getChildren().includes(split)) {
            foundSplitPoint = true;
            if (child instanceof solc_typed_ast_1.Block || child instanceof solc_typed_ast_1.UncheckedBlock) {
                statementsToExtract.push(splitBlock(child, split, ast));
            }
            else {
                (0, assert_1.default)(false);
            }
        }
    });
    statementsToExtract.forEach((child) => {
        if (block.children.includes(child)) {
            block.removeChild(child);
        }
        newBlock.appendChild(child);
    });
    return newBlock;
}
function createSplitFunction(existingFunction, body, counter, ast) {
    const newFuncId = ast.reserveId();
    // Collect variables referenced in the split function that need to be passed in
    const unboundVariables = new Map([...(0, functionGeneration_1.collectUnboundVariables)(body).entries()].filter(([decl]) => !decl.stateVariable));
    const inputParams = [...unboundVariables.entries()].map(([decl, ids]) => {
        const newDecl = (0, cloning_1.cloneASTNode)(decl, ast);
        ids.forEach((id) => (id.referencedDeclaration = newDecl.id));
        newDecl.scope = newFuncId;
        return newDecl;
    });
    const retParams = (0, cloning_1.cloneASTNode)(existingFunction.vReturnParameters, ast);
    retParams.vParameters.forEach((decl) => (decl.scope = newFuncId));
    const funcDef = new solc_typed_ast_1.FunctionDefinition(newFuncId, '', existingFunction.scope, existingFunction.kind === solc_typed_ast_1.FunctionKind.Free ? solc_typed_ast_1.FunctionKind.Free : solc_typed_ast_1.FunctionKind.Function, `${existingFunction.name}${nameModifiers_1.IF_FUNCTIONALISER_INFIX}${counter + 1}`, false, solc_typed_ast_1.FunctionVisibility.Private, existingFunction.stateMutability, false, (0, nodeTemplates_1.createParameterList)(inputParams, ast), retParams, [], undefined, body);
    const args = [...unboundVariables.keys()].map((decl) => (0, nodeTemplates_1.createIdentifier)(decl, ast));
    const call = (0, functionGeneration_1.createCallToFunction)(funcDef, args, ast, existingFunction);
    return [funcDef, call];
}
function addSplitFunctionToScope(originalFunction, splitFunction, ast) {
    originalFunction.vScope.insertAfter(splitFunction, originalFunction);
    ast.registerChild(splitFunction, originalFunction.vScope);
}
function addCallsToSplitFunction(node, originalFunction, call, ast) {
    const returnStatement = (0, nodeTemplates_1.createReturn)(call, originalFunction.vReturnParameters.id, ast);
    ast.insertStatementAfter(node.vTrueBody, returnStatement);
    if (node.vFalseBody) {
        ast.insertStatementAfter(node.vFalseBody, (0, cloning_1.cloneASTNode)(returnStatement, ast));
    }
    else {
        node.vFalseBody = (0, cloning_1.cloneASTNode)(returnStatement, ast);
        ast.registerChild(node.vFalseBody, node);
    }
}
function ensureBothBranchesAreBlocks(node, ast) {
    if (!(node.vTrueBody instanceof solc_typed_ast_1.Block) && !(node.vTrueBody instanceof solc_typed_ast_1.UncheckedBlock)) {
        node.vTrueBody = (0, nodeTemplates_1.createBlock)([node.vTrueBody], ast);
        ast.registerChild(node.vTrueBody, node);
    }
    if (node.vFalseBody &&
        !(node.vFalseBody instanceof solc_typed_ast_1.Block) &&
        !(node.vFalseBody instanceof solc_typed_ast_1.UncheckedBlock)) {
        node.vFalseBody = (0, nodeTemplates_1.createBlock)([node.vFalseBody], ast);
        ast.registerChild(node.vFalseBody, node);
    }
}
//# sourceMappingURL=ifFunctionaliser.js.map