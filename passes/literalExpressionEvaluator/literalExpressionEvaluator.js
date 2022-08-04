"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LiteralExpressionEvaluator = void 0;
const solc_typed_ast_1 = require("solc-typed-ast");
const mapper_1 = require("../../ast/mapper");
const errors_1 = require("../../utils/errors");
const nodeTemplates_1 = require("../../utils/nodeTemplates");
const utils_1 = require("../../utils/utils");
const rationalLiteral_1 = require("./rationalLiteral");
/*
  solidity operators which could be literal:
  (x) tuple expressions can contain literals
  -, !
  ** (exponent will always be an integer)
  *, /, %,
  +, -
  >, <, <=, >=
  ==, !=
  &&, ||

  Hence all literal nodes are of type Literal | UnaryOperation | BinaryOperation
*/
class LiteralExpressionEvaluator extends mapper_1.ASTMapper {
    // Function to add passes that should have been run before this pass
    addInitialPassPrerequisites() {
        const passKeys = new Set([]);
        passKeys.forEach((key) => this.addPassPrerequisite(key));
    }
    visitPossibleLiteralExpression(node, ast) {
        // It is sometimes possible to avoid any calculation and take the value from the type
        // This is not always possible because boolean literals do not contain their value in the type,
        // and because very large int and rational literals omit some digits
        const result = createLiteralFromType(node.typeString) ?? evaluateLiteralExpression(node);
        if (result === null) {
            this.commonVisit(node, ast);
        }
        else if (typeof result === 'boolean') {
            ast.replaceNode(node, (0, nodeTemplates_1.createBoolLiteral)(result, ast));
        }
        else {
            const intValue = result.toInteger();
            if (intValue === null) {
                throw new errors_1.TranspileFailedError('Attempted to make node for non-integral literal');
            }
            ast.replaceNode(node, (0, nodeTemplates_1.createNumberLiteral)(intValue, ast));
        }
    }
    visitBinaryOperation(node, ast) {
        this.visitPossibleLiteralExpression(node, ast);
    }
    visitLiteral(node, ast) {
        this.visitPossibleLiteralExpression(node, ast);
    }
    visitUnaryOperation(node, ast) {
        this.visitPossibleLiteralExpression(node, ast);
    }
}
exports.LiteralExpressionEvaluator = LiteralExpressionEvaluator;
function evaluateLiteralExpression(node) {
    if (node instanceof solc_typed_ast_1.Literal) {
        return evaluateLiteral(node);
    }
    else if (node instanceof solc_typed_ast_1.UnaryOperation) {
        return evaluateUnaryLiteral(node);
    }
    else if (node instanceof solc_typed_ast_1.BinaryOperation) {
        return evaluateBinaryLiteral(node);
    }
    else if (node instanceof solc_typed_ast_1.TupleExpression) {
        return evaluateTupleLiteral(node);
    }
    else {
        // Not a literal expression
        return null;
    }
}
function evaluateLiteral(node) {
    // Other passes can produce numeric literals from statements that the solidity compiler does not treat as constant
    // These should not be evaluated with compile time arbitrary precision arithmetic
    // A pass could potentially evaluate them at compile time,
    // but this would purely be an optimisation and not required for correctness
    if (node.kind === solc_typed_ast_1.LiteralKind.Number && isConstType(node.typeString)) {
        const value = (0, rationalLiteral_1.stringToLiteralValue)(node.value);
        return value.multiply(new rationalLiteral_1.RationalLiteral(BigInt((0, utils_1.unitValue)(node.subdenomination)), 1n));
    }
    else if (node.kind === solc_typed_ast_1.LiteralKind.Bool) {
        return node.value === 'true';
    }
    else {
        return null;
    }
}
function evaluateUnaryLiteral(node) {
    const op = evaluateLiteralExpression(node.vSubExpression);
    if (op === null)
        return null;
    switch (node.operator) {
        case '~': {
            if (typeof op === 'boolean') {
                throw new errors_1.TranspileFailedError('Attempted to apply unary bitwise negation to boolean');
            }
            return op.bitwiseNegate();
        }
        case '-':
            if (typeof op === 'boolean') {
                throw new errors_1.TranspileFailedError('Attempted to apply unary numeric negation to boolean');
            }
            return op.multiply(new rationalLiteral_1.RationalLiteral(-1n, 1n));
        case '!':
            if (typeof op !== 'boolean') {
                throw new errors_1.TranspileFailedError('Attempted to apply boolean negation to RationalLiteral');
            }
            return !op;
        default:
            return null;
    }
}
function evaluateBinaryLiteral(node) {
    const [left, right] = [
        evaluateLiteralExpression(node.vLeftExpression),
        evaluateLiteralExpression(node.vRightExpression),
    ];
    if (left === null || right === null) {
        return null;
    }
    else if (typeof left === 'boolean' && typeof right === 'boolean') {
        switch (node.operator) {
            case '==':
                return left === right;
            case '!=':
                return left !== right;
            case '&&':
                return left && right;
            case '||':
                return left || right;
            default:
                throw new errors_1.TranspileFailedError(`Unexpected boolean x boolean operator ${node.operator}`);
        }
    }
    else if (typeof left !== 'boolean' && typeof right !== 'boolean') {
        switch (node.operator) {
            case '**':
                return left.exp(right);
            case '*':
                return left.multiply(right);
            case '/':
                return left.divideBy(right);
            case '%':
                return left.mod(right);
            case '+':
                return left.add(right);
            case '-':
                return left.subtract(right);
            case '>':
                return left.greaterThan(right);
            case '<':
                return !left.greaterThan(right) && !left.equalValueOf(right);
            case '>=':
                return left.greaterThan(right) || left.equalValueOf(right);
            case '<=':
                return !left.greaterThan(right);
            case '==':
                return left.equalValueOf(right);
            case '!=':
                return !left.equalValueOf(right);
            case '<<':
                return left.shiftLeft(right);
            case '>>':
                return left.shiftRight(right);
            default:
                throw new errors_1.TranspileFailedError(`Unexpected number x number operator ${node.operator}`);
        }
    }
    else {
        throw new errors_1.TranspileFailedError('Mismatching literal arguments');
    }
}
function evaluateTupleLiteral(node) {
    if (node.vOriginalComponents.length == 1 && node.vOriginalComponents[0] !== null) {
        return evaluateLiteralExpression(node.vOriginalComponents[0]);
    }
    return null;
}
function isConstType(typeString) {
    return typeString.startsWith('int_const') || typeString.startsWith('rational_const');
}
function createLiteralFromType(typeString) {
    if (typeString.startsWith('int_const ')) {
        const valueString = typeString.substring('int_const '.length);
        const value = Number(valueString);
        if (!isNaN(value)) {
            return new rationalLiteral_1.RationalLiteral(BigInt(valueString), 1n);
        }
    }
    else if (typeString.startsWith('rational_const ')) {
        const valueString = typeString.substring('rational_const '.length);
        const numeratorString = valueString.split('/')[0].trim();
        const denominatorString = valueString.split('/')[1].trim();
        const numerator = Number(numeratorString);
        const denominator = Number(denominatorString);
        if (!isNaN(numerator) && !isNaN(denominator)) {
            return new rationalLiteral_1.RationalLiteral(BigInt(numeratorString), BigInt(denominatorString));
        }
    }
    return null;
}
//# sourceMappingURL=literalExpressionEvaluator.js.map