"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExpressionSplitter = void 0;
const assert_1 = __importDefault(require("assert"));
const solc_typed_ast_1 = require("solc-typed-ast");
const mapper_1 = require("../../ast/mapper");
const astPrinter_1 = require("../../utils/astPrinter");
const cloning_1 = require("../../utils/cloning");
const errors_1 = require("../../utils/errors");
const functionGeneration_1 = require("../../utils/functionGeneration");
const nameModifiers_1 = require("../../utils/nameModifiers");
const nodeTemplates_1 = require("../../utils/nodeTemplates");
const utils_1 = require("../../utils/utils");
const conditionalFunctionaliser_1 = require("./conditionalFunctionaliser");
function* expressionGenerator(prefix) {
    const count = (0, utils_1.counterGenerator)();
    while (true) {
        yield `${prefix}${count.next().value}`;
    }
}
class ExpressionSplitter extends mapper_1.ASTMapper {
    constructor() {
        super(...arguments);
        this.eGen = expressionGenerator(nameModifiers_1.SPLIT_EXPRESSION_PREFIX);
        this.funcNameCounter = 0;
        this.varNameCounter = 0;
    }
    // Function to add passes that should have been run before this pass
    addInitialPassPrerequisites() {
        const passKeys = new Set([]);
        passKeys.forEach((key) => this.addPassPrerequisite(key));
    }
    visitAssignment(node, ast) {
        this.commonVisit(node, ast);
        if (!(node.parent instanceof solc_typed_ast_1.ExpressionStatement)) {
            // No need to create temp vars for state vars
            if (node.vLeftHandSide instanceof solc_typed_ast_1.Identifier &&
                identifierReferenceStateVar(node.vLeftHandSide)) {
                return;
            }
            const leftHandSide = (0, cloning_1.cloneASTNode)(node.vLeftHandSide, ast);
            const rightHandSide = (0, cloning_1.cloneASTNode)(node.vRightHandSide, ast);
            const tempVarStatement = createVariableDeclarationStatement(this.eGen.next().value, rightHandSide, ast.getContainingScope(node), ast);
            const tempVar = tempVarStatement.vDeclarations[0];
            const updateVal = createAssignmentStatement('=', leftHandSide, (0, nodeTemplates_1.createIdentifier)(tempVar, ast), ast);
            ast.insertStatementBefore(node, tempVarStatement);
            ast.insertStatementBefore(node, updateVal);
            ast.replaceNode(node, (0, nodeTemplates_1.createIdentifier)(tempVar, ast));
        }
    }
    visitFunctionCall(node, ast) {
        this.commonVisit(node, ast);
        if (!(node.vReferencedDeclaration instanceof solc_typed_ast_1.FunctionDefinition) ||
            node.parent instanceof solc_typed_ast_1.ExpressionStatement ||
            node.parent instanceof solc_typed_ast_1.VariableDeclarationStatement) {
            return;
        }
        const returnTypes = node.vReferencedDeclaration.vReturnParameters.vParameters;
        if (returnTypes.length === 0) {
            const parent = node.parent;
            (0, assert_1.default)(parent !== undefined, `${(0, astPrinter_1.printNode)(node)} ${node.vFunctionName} has no parent`);
            ast.replaceNode(node, (0, nodeTemplates_1.createEmptyTuple)(ast));
            ast.insertStatementBefore(parent, new solc_typed_ast_1.ExpressionStatement(ast.reserveId(), '', node));
        }
        else if (returnTypes.length === 1) {
            (0, assert_1.default)(returnTypes[0].vType !== undefined, 'Return types should not be undefined since solidity 0.5.0');
            ast.extractToConstant(node, (0, cloning_1.cloneASTNode)(returnTypes[0].vType, ast), this.eGen.next().value);
        }
        else {
            throw new errors_1.TranspileFailedError(`ExpressionSplitter expects functions to have at most 1 return argument. ${(0, astPrinter_1.printNode)(node)} ${node.vFunctionName} has ${returnTypes.length}`);
        }
    }
    visitConditional(node, ast) {
        const containingFunction = (0, conditionalFunctionaliser_1.getContainingFunction)(node);
        const variables = (0, conditionalFunctionaliser_1.getNodeVariables)(node);
        const inputs = (0, conditionalFunctionaliser_1.getInputs)(variables, ast);
        const params = (0, conditionalFunctionaliser_1.getParams)(variables, ast);
        const newFuncId = ast.reserveId();
        const returns = (0, conditionalFunctionaliser_1.getReturns)(node, variables, newFuncId, this.varNameCounter++, ast);
        const func = new solc_typed_ast_1.FunctionDefinition(newFuncId, '', containingFunction.scope, containingFunction.kind === solc_typed_ast_1.FunctionKind.Free ? solc_typed_ast_1.FunctionKind.Free : solc_typed_ast_1.FunctionKind.Function, `_conditional${this.funcNameCounter++}`, false, solc_typed_ast_1.FunctionVisibility.Internal, containingFunction.stateMutability, false, params, returns, [], undefined, (0, conditionalFunctionaliser_1.createFunctionBody)(node, returns, ast));
        (0, functionGeneration_1.fixParameterScopes)(func);
        containingFunction.vScope.insertBefore(func, containingFunction);
        ast.registerChild(func, containingFunction.vScope);
        this.dispatchVisit(func, ast);
        const conditionalResult = (0, conditionalFunctionaliser_1.getConditionalReturnVariable)(node, containingFunction.id, this.varNameCounter++, ast);
        (0, conditionalFunctionaliser_1.addStatementsToCallFunction)(node, conditionalResult, [...variables.keys()], (0, functionGeneration_1.createCallToFunction)(func, inputs, ast), ast);
        ast.replaceNode(node, (0, nodeTemplates_1.createIdentifier)(conditionalResult, ast));
    }
}
exports.ExpressionSplitter = ExpressionSplitter;
function identifierReferenceStateVar(id) {
    const refDecl = id.vReferencedDeclaration;
    return (refDecl instanceof solc_typed_ast_1.VariableDeclaration &&
        refDecl.getClosestParentByType(solc_typed_ast_1.ContractDefinition)?.id === refDecl.scope);
}
function createVariableDeclarationStatement(name, initalValue, scope, ast) {
    const location = (0, solc_typed_ast_1.generalizeType)((0, solc_typed_ast_1.getNodeType)(initalValue, ast.compilerVersion))[1] ?? solc_typed_ast_1.DataLocation.Default;
    const varDecl = new solc_typed_ast_1.VariableDeclaration(ast.reserveId(), '', false, false, name, scope, false, location, solc_typed_ast_1.StateVariableVisibility.Internal, solc_typed_ast_1.Mutability.Constant, initalValue.typeString);
    ast.setContextRecursive(varDecl);
    const varDeclStatement = new solc_typed_ast_1.VariableDeclarationStatement(ast.reserveId(), '', [varDecl.id], [varDecl], initalValue);
    return varDeclStatement;
}
function createAssignmentStatement(operator, lhs, rhs, ast) {
    return new solc_typed_ast_1.ExpressionStatement(ast.reserveId(), '', new solc_typed_ast_1.Assignment(ast.reserveId(), '', lhs.typeString, operator, lhs, rhs));
}
//# sourceMappingURL=expressionSplitter.js.map