"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TupleAssignmentSplitter = void 0;
const assert_1 = __importDefault(require("assert"));
const solc_typed_ast_1 = require("solc-typed-ast");
const mapper_1 = require("../ast/mapper");
const astPrinter_1 = require("../utils/astPrinter");
const cloning_1 = require("../utils/cloning");
const nameModifiers_1 = require("../utils/nameModifiers");
const nodeTemplates_1 = require("../utils/nodeTemplates");
const typeConstructs_1 = require("../utils/typeConstructs");
const utils_1 = require("../utils/utils");
// Converts a non-declaration tuple assignment into a declaration of temporary variables,
// and piecewise assignments (x,y) = (y,x) -> (int a, int b) = (y,x); x = a; y = b;
// Also converts tuple returns into a tuple declaration and elementwise return
// This allows type conversions in cases where the individual elements would otherwise not be
// accessible, such as when returning a function call
class TupleAssignmentSplitter extends mapper_1.ASTMapper {
    constructor() {
        super(...arguments);
        this.lastTempVarNumber = 0;
    }
    // Function to add passes that should have been run before this pass
    addInitialPassPrerequisites() {
        const passKeys = new Set([]);
        passKeys.forEach((key) => this.addPassPrerequisite(key));
    }
    newTempVarName() {
        return `${nameModifiers_1.TUPLE_VALUE_PREFIX}${this.lastTempVarNumber++}`;
    }
    visitExpressionStatement(node, ast) {
        this.commonVisit(node, ast);
        if (node.vExpression instanceof solc_typed_ast_1.Assignment) {
            if (node.vExpression.vLeftHandSide instanceof solc_typed_ast_1.TupleExpression) {
                ast.replaceNode(node, this.splitTupleAssignment(node.vExpression, ast));
            }
        }
    }
    visitReturn(node, ast) {
        this.commonVisit(node, ast);
        if (node.vFunctionReturnParameters.vParameters.length > 1) {
            const returnExpression = node.vExpression;
            (0, assert_1.default)(returnExpression !== undefined, `Tuple return ${(0, astPrinter_1.printNode)(node)} has undefined value. Expects ${node.vFunctionReturnParameters.vParameters.length} parameters`);
            const vars = node.vFunctionReturnParameters.vParameters.map((v) => (0, cloning_1.cloneASTNode)(v, ast));
            ast.insertStatementBefore(node, new solc_typed_ast_1.VariableDeclarationStatement(ast.reserveId(), '', vars.map((d) => d.id), vars, returnExpression));
            node.vExpression = new solc_typed_ast_1.TupleExpression(ast.reserveId(), '', returnExpression.typeString, false, vars.map((v) => (0, nodeTemplates_1.createIdentifier)(v, ast, undefined, node)));
            ast.registerChild(node.vExpression, node);
        }
    }
    splitTupleAssignment(node, ast) {
        const [lhs, rhs] = [node.vLeftHandSide, node.vRightHandSide];
        (0, assert_1.default)(lhs instanceof solc_typed_ast_1.TupleExpression, `Split tuple assignment was called on non-tuple assignment ${node.type} # ${node.id}`);
        const rhsType = (0, solc_typed_ast_1.getNodeType)(rhs, ast.compilerVersion);
        (0, assert_1.default)(rhsType instanceof solc_typed_ast_1.TupleType, `Expected rhs of tuple assignment to be tuple type ${(0, astPrinter_1.printNode)(node)}`);
        const block = (0, nodeTemplates_1.createBlock)([], ast);
        const tempVars = new Map(lhs.vOriginalComponents.filter(typeConstructs_1.notNull).map((child, index) => {
            const lhsElementType = (0, solc_typed_ast_1.getNodeType)(child, ast.compilerVersion);
            const rhsElementType = rhsType.elements[index];
            // We need to calculate a type and location for the temporary variable
            // By default we can use the rhs value, unless it is a literal
            let typeNode;
            let location;
            if (rhsElementType instanceof solc_typed_ast_1.IntLiteralType) {
                [typeNode, location] = (0, solc_typed_ast_1.generalizeType)(lhsElementType);
            }
            else if (rhsElementType instanceof solc_typed_ast_1.StringLiteralType) {
                typeNode = (0, solc_typed_ast_1.generalizeType)(lhsElementType)[0];
                location = solc_typed_ast_1.DataLocation.Memory;
            }
            else {
                [typeNode, location] = (0, solc_typed_ast_1.generalizeType)(rhsElementType);
            }
            const typeName = (0, utils_1.typeNameFromTypeNode)(typeNode, ast);
            const decl = new solc_typed_ast_1.VariableDeclaration(ast.reserveId(), node.src, true, false, this.newTempVarName(), block.id, false, location ?? solc_typed_ast_1.DataLocation.Default, solc_typed_ast_1.StateVariableVisibility.Default, solc_typed_ast_1.Mutability.Constant, typeNode.pp(), undefined, typeName);
            ast.setContextRecursive(decl);
            return [child, decl];
        }));
        const tempTupleDeclaration = new solc_typed_ast_1.VariableDeclarationStatement(ast.reserveId(), node.src, lhs.vOriginalComponents.map((n) => (n === null ? null : tempVars.get(n)?.id ?? null)), [...tempVars.values()], node.vRightHandSide);
        const assignments = [...tempVars.entries()]
            .filter(([_, tempVar]) => tempVar.storageLocation !== solc_typed_ast_1.DataLocation.CallData)
            .map(([target, tempVar]) => new solc_typed_ast_1.ExpressionStatement(ast.reserveId(), node.src, new solc_typed_ast_1.Assignment(ast.reserveId(), node.src, target.typeString, '=', target, (0, nodeTemplates_1.createIdentifier)(tempVar, ast, undefined, node))))
            .reverse();
        block.appendChild(tempTupleDeclaration);
        assignments.forEach((n) => block.appendChild(n));
        ast.setContextRecursive(block);
        return block;
    }
}
exports.TupleAssignmentSplitter = TupleAssignmentSplitter;
//# sourceMappingURL=tupleAssignmentSplitter.js.map