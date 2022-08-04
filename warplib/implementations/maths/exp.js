"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.functionaliseExp = exports.exp_signed_unsafe = exports.exp_unsafe = exports.exp_signed = exports.exp = void 0;
const assert_1 = __importDefault(require("assert"));
const solc_typed_ast_1 = require("solc-typed-ast");
const astPrinter_1 = require("../../../utils/astPrinter");
const functionGeneration_1 = require("../../../utils/functionGeneration");
const utils_1 = require("../../../utils/utils");
const utils_2 = require("../../utils");
function exp() {
    createExp(false, false);
}
exports.exp = exp;
function exp_signed() {
    createExp(true, false);
}
exports.exp_signed = exp_signed;
function exp_unsafe() {
    createExp(false, true);
}
exports.exp_unsafe = exp_unsafe;
function exp_signed_unsafe() {
    createExp(true, true);
}
exports.exp_signed_unsafe = exp_signed_unsafe;
function createExp(signed, unsafe) {
    const suffix = `${signed ? '_signed' : ''}${unsafe ? '_unsafe' : ''}`;
    (0, utils_2.generateFile)(`exp${suffix}`, [
        'from starkware.cairo.common.bitwise import bitwise_and',
        'from starkware.cairo.common.cairo_builtins import BitwiseBuiltin',
        'from starkware.cairo.common.uint256 import Uint256, uint256_sub',
        `from warplib.maths.mul${suffix} import ${(0, utils_1.mapRange)(32, (n) => `warp_mul${suffix}${8 * n + 8}`).join(', ')}`,
    ], (0, utils_2.forAllWidths)((width) => {
        if (width === 256) {
            return [
                `func _repeated_multiplication${width}{range_check_ptr, bitwise_ptr : BitwiseBuiltin*}(op : Uint256, count : felt) -> (res : Uint256):`,
                `    if count == 0:`,
                `        return (Uint256(1, 0))`,
                `    end`,
                `    let (x) = _repeated_multiplication${width}(op, count - 1)`,
                `    let (res) = warp_mul${suffix}${width}(op, x)`,
                `    return (res)`,
                `end`,
                `func warp_exp${suffix}${width}{range_check_ptr, bitwise_ptr : BitwiseBuiltin*}(lhs : Uint256, rhs : felt) -> (res : Uint256):`,
                `    if rhs == 0:`,
                `        return (Uint256(1, 0))`,
                '    end',
                '    if lhs.high == 0 :',
                `        if lhs.low * (lhs.low - 1) == 0:`,
                '            return (lhs)',
                `        end`,
                `    end`,
                ...getNegativeOneShortcutCode(signed, width, false),
                `    let (res) = _repeated_multiplication${width}(lhs, rhs)`,
                `    return (res)`,
                `end`,
                `func _repeated_multiplication_256_${width}{range_check_ptr, bitwise_ptr : BitwiseBuiltin*}(op : Uint256, count : Uint256) -> (res : Uint256):`,
                `    if count.low == 0:`,
                `        if count.high == 0:`,
                `            return (Uint256(1, 0))`,
                `        end`,
                `    end`,
                `    let (decr) = uint256_sub(count, Uint256(1, 0))`,
                `    let (x) = _repeated_multiplication_256_${width}(op, decr)`,
                `    let (res) = warp_mul${suffix}${width}(op, x)`,
                `    return (res)`,
                `end`,
                `func warp_exp_wide${suffix}${width}{range_check_ptr, bitwise_ptr : BitwiseBuiltin*}(lhs : Uint256, rhs : Uint256) -> (res : Uint256):`,
                `    if rhs.high == 0:`,
                `        if rhs.low == 0:`,
                `            return (Uint256(1, 0))`,
                `        end`,
                '    end',
                '    if lhs.high == 0 :',
                `        if lhs.low * (lhs.low - 1) == 0:`,
                '            return (lhs)',
                `        end`,
                `    end`,
                ...getNegativeOneShortcutCode(signed, width, true),
                `    let (res) = _repeated_multiplication_256_${width}(lhs, rhs)`,
                `    return (res)`,
                `end`,
            ];
        }
        else {
            return [
                `func _repeated_multiplication${width}{range_check_ptr, bitwise_ptr : BitwiseBuiltin*}(op : felt, count : felt) -> (res : felt):`,
                `    alloc_locals`,
                `    if count == 0:`,
                `        return (1)`,
                `    else:`,
                `        let (x) = _repeated_multiplication${width}(op, count - 1)`,
                `        local bitwise_ptr : BitwiseBuiltin* = bitwise_ptr`,
                `        let (res) = warp_mul${suffix}${width}(op, x)`,
                `        return (res)`,
                `    end`,
                `end`,
                `func warp_exp${suffix}${width}{range_check_ptr, bitwise_ptr : BitwiseBuiltin*}(lhs : felt, rhs : felt) -> (res : felt):`,
                '    if rhs == 0:',
                '        return (1)',
                `    end`,
                '    if lhs * (lhs-1) * (rhs-1) == 0:',
                '        return (lhs)',
                '    end',
                ...getNegativeOneShortcutCode(signed, width, false),
                `    let (res) = _repeated_multiplication${width}(lhs, rhs)`,
                `    return (res)`,
                'end',
                `func _repeated_multiplication_256_${width}{range_check_ptr, bitwise_ptr : BitwiseBuiltin*}(op : felt, count : Uint256) -> (res : felt):`,
                `    alloc_locals`,
                `    if count.low == 0:`,
                `        if count.high == 0:`,
                `            return (1)`,
                `        end`,
                `    end`,
                `    let (decr) = uint256_sub(count, Uint256(1, 0))`,
                `    let (x) = _repeated_multiplication_256_${width}(op, decr)`,
                `    local bitwise_ptr : BitwiseBuiltin* = bitwise_ptr`,
                `    let (res) = warp_mul${suffix}${width}(op, x)`,
                `    return (res)`,
                `end`,
                `func warp_exp_wide${suffix}${width}{range_check_ptr, bitwise_ptr : BitwiseBuiltin*}(lhs : felt, rhs : Uint256) -> (res : felt):`,
                '    if rhs.low == 0:',
                '        if rhs.high == 0:',
                '            return (1)',
                '        end',
                `    end`,
                '    if lhs * (lhs-1) == 0:',
                '        return (lhs)',
                '    end',
                '    if rhs.low == 1:',
                '        if rhs.high == 0:',
                '            return (lhs)',
                '        end',
                '    end',
                ...getNegativeOneShortcutCode(signed, width, true),
                `    let (res) = _repeated_multiplication_256_${width}(lhs, rhs)`,
                `    return (res)`,
                'end',
            ];
        }
    }));
}
function getNegativeOneShortcutCode(signed, lhsWidth, rhsWide) {
    if (!signed)
        return [];
    if (lhsWidth < 256) {
        return [
            `if (lhs - ${(0, utils_2.mask)(lhsWidth)}) == 0:`,
            `    let (is_odd) = bitwise_and(${rhsWide ? 'rhs.low' : 'rhs'}, 1)`,
            `    return (1 + is_odd * 0x${'f'.repeat(lhsWidth / 8 - 1)}e)`,
            `end`,
        ];
    }
    else {
        return [
            `if (lhs.low - ${(0, utils_2.mask)(128)}) == 0:`,
            `    if (lhs.high - ${(0, utils_2.mask)(128)}) == 0:`,
            `        let (is_odd) = bitwise_and(${rhsWide ? 'rhs.low' : 'rhs'}, 1)`,
            `        return (Uint256(1 + is_odd * 0x${'f'.repeat(31)}e, is_odd * ${(0, utils_2.mask)(128)}))`,
            `    end`,
            `end`,
        ];
    }
}
function functionaliseExp(node, unsafe, ast) {
    const lhsType = (0, solc_typed_ast_1.getNodeType)(node.vLeftExpression, ast.compilerVersion);
    const rhsType = (0, solc_typed_ast_1.getNodeType)(node.vRightExpression, ast.compilerVersion);
    const retType = (0, solc_typed_ast_1.getNodeType)(node, ast.compilerVersion);
    (0, assert_1.default)(retType instanceof solc_typed_ast_1.IntType, `${(0, astPrinter_1.printNode)(node)} has type ${(0, astPrinter_1.printTypeNode)(retType)}, which is not compatible with **`);
    (0, assert_1.default)(rhsType instanceof solc_typed_ast_1.IntType, `${(0, astPrinter_1.printNode)(node)} has rhs-type ${rhsType.pp()}, which is not compatible with **`);
    const fullName = [
        'warp_',
        'exp',
        rhsType.nBits === 256 ? '_wide' : '',
        retType.signed ? '_signed' : '',
        unsafe ? '_unsafe' : '',
        `${(0, utils_2.getIntOrFixedByteBitWidth)(retType)}`,
    ].join('');
    const importName = [
        'warplib.maths.',
        'exp',
        retType.signed ? '_signed' : '',
        unsafe ? '_unsafe' : '',
    ].join('');
    const stub = (0, functionGeneration_1.createCairoFunctionStub)(fullName, [
        ['lhs', (0, utils_1.typeNameFromTypeNode)(lhsType, ast)],
        ['rhs', (0, utils_1.typeNameFromTypeNode)(rhsType, ast)],
    ], [['res', (0, utils_1.typeNameFromTypeNode)(retType, ast)]], ['range_check_ptr', 'bitwise_ptr'], ast, node);
    const call = new solc_typed_ast_1.FunctionCall(ast.reserveId(), node.src, node.typeString, solc_typed_ast_1.FunctionCallKind.FunctionCall, new solc_typed_ast_1.Identifier(ast.reserveId(), '', `function (${node.typeString}, ${node.typeString}) returns (${node.typeString})`, fullName, stub.id), [node.vLeftExpression, node.vRightExpression]);
    ast.replaceNode(node, call);
    ast.registerImport(call, importName, fullName);
}
exports.functionaliseExp = functionaliseExp;
//# sourceMappingURL=exp.js.map