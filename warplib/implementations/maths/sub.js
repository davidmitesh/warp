"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.functionaliseSub = exports.sub_signed_unsafe = exports.sub_signed = exports.sub_unsafe = void 0;
const assert_1 = __importDefault(require("assert"));
const solc_typed_ast_1 = require("solc-typed-ast");
const astPrinter_1 = require("../../../utils/astPrinter");
const utils_1 = require("../../utils");
function sub_unsafe() {
    (0, utils_1.generateFile)('sub_unsafe', [
        'from starkware.cairo.common.bitwise import bitwise_and',
        'from starkware.cairo.common.cairo_builtins import BitwiseBuiltin',
        'from starkware.cairo.common.uint256 import Uint256',
    ], (0, utils_1.forAllWidths)((width) => {
        if (width === 256) {
            return [
                `func warp_sub_unsafe256{bitwise_ptr : BitwiseBuiltin*}(lhs : Uint256, rhs : Uint256) -> (`,
                `        result : Uint256):`,
                '    #preemptively borrow from bit128',
                `    let (low_safe) = bitwise_and(${(0, utils_1.bound)(128)} + lhs.low - rhs.low, ${(0, utils_1.mask)(128)})`,
                `    let low_unsafe = lhs.low - rhs.low`,
                `    if low_safe == low_unsafe:`,
                '        #the borrow was not used',
                `        let (high) = bitwise_and(${(0, utils_1.bound)(128)} + lhs.high - rhs.high, ${(0, utils_1.mask)(128)})`,
                `        return (Uint256(low_safe, high))`,
                `    else:`,
                '        #the borrow was used',
                `        let (high) = bitwise_and(${(0, utils_1.bound)(128)} + lhs.high - rhs.high - 1, ${(0, utils_1.mask)(128)})`,
                `        return (Uint256(low_safe, high))`,
                `    end`,
                `end`,
            ];
        }
        else {
            return [
                `func warp_sub_unsafe${width}{bitwise_ptr : BitwiseBuiltin*}(lhs : felt, rhs : felt) -> (`,
                `        res : felt):`,
                `    let res : felt = ${(0, utils_1.bound)(width)} + lhs - rhs`,
                `    let (res) = bitwise_and(res, ${(0, utils_1.mask)(width)})`,
                `    return (res)`,
                `end`,
            ];
        }
    }));
}
exports.sub_unsafe = sub_unsafe;
function sub_signed() {
    (0, utils_1.generateFile)('sub_signed', [
        'from starkware.cairo.common.bitwise import bitwise_and',
        'from starkware.cairo.common.cairo_builtins import BitwiseBuiltin',
        'from starkware.cairo.common.uint256 import Uint256, uint256_add, uint256_signed_le, uint256_sub, uint256_not',
    ], (0, utils_1.forAllWidths)((width) => {
        if (width === 256) {
            return [
                `func warp_sub_signed${width}{range_check_ptr, bitwise_ptr : BitwiseBuiltin*}(lhs : Uint256, rhs : Uint256) -> (`,
                `        res : Uint256):`,
                `    # First sign extend both operands`,
                `    let (left_msb : felt) = bitwise_and(lhs.high, ${(0, utils_1.msb)(128)})`,
                `    let (right_msb : felt) = bitwise_and(rhs.high, ${(0, utils_1.msb)(128)})`,
                `    let left_overflow : felt = left_msb / ${(0, utils_1.msb)(128)}`,
                `    let right_overflow : felt = right_msb / ${(0, utils_1.msb)(128)}`,
                ``,
                `    # Now safely negate the rhs and add (l - r = l + (-r))`,
                `    let (right_flipped : Uint256) = uint256_not(rhs)`,
                `    let (right_neg, overflow) = uint256_add(right_flipped, Uint256(1,0))`,
                `    let right_overflow_neg = overflow + 1 - right_overflow`,
                `    let (res, res_base_overflow) = uint256_add(lhs, right_neg)`,
                `    let res_overflow = res_base_overflow + left_overflow + right_overflow_neg`,
                ``,
                `    # Check if the result fits in the correct width`,
                `    let (res_msb : felt) = bitwise_and(res.high, ${(0, utils_1.msb)(128)})`,
                `    let (res_overflow_lsb : felt) = bitwise_and(res_overflow, 1)`,
                `    assert res_overflow_lsb * ${(0, utils_1.msb)(128)} = res_msb`,
                ``,
                `    # Narrow and return`,
                `    return (res)`,
                `end`,
            ];
        }
        else {
            return [
                `func warp_sub_signed${width}{bitwise_ptr : BitwiseBuiltin*}(lhs : felt, rhs : felt) -> (`,
                `        res : felt):`,
                `    # First sign extend both operands`,
                `    let (left_msb : felt) = bitwise_and(lhs, ${(0, utils_1.msb)(width)})`,
                `    let (right_msb : felt) = bitwise_and(rhs, ${(0, utils_1.msb)(width)})`,
                `    let left_safe : felt = lhs + 2 * left_msb`,
                `    let right_safe : felt = rhs + 2 * right_msb`,
                ``,
                `    # Now safely negate the rhs and add (l - r = l + (-r))`,
                `    let right_neg : felt = ${(0, utils_1.bound)(width + 1)} - right_safe`,
                `    let extended_res : felt = left_safe + right_neg`,
                ``,
                `    # Check if the result fits in the correct width`,
                `    let (overflowBits) = bitwise_and(extended_res, ${(0, utils_1.msbAndNext)(width)})`,
                `    assert overflowBits * (overflowBits - ${(0, utils_1.msbAndNext)(width)}) = 0`,
                ``,
                `    # Narrow and return`,
                `    let (res) = bitwise_and(extended_res, ${(0, utils_1.mask)(width)})`,
                `    return (res)`,
                `end`,
            ];
        }
    }));
}
exports.sub_signed = sub_signed;
function sub_signed_unsafe() {
    (0, utils_1.generateFile)('sub_signed_unsafe', [
        'from starkware.cairo.common.bitwise import bitwise_and',
        'from starkware.cairo.common.cairo_builtins import BitwiseBuiltin',
        'from starkware.cairo.common.uint256 import Uint256, uint256_sub',
    ], (0, utils_1.forAllWidths)((width) => {
        if (width === 256) {
            return [
                'func warp_sub_signed_unsafe256{range_check_ptr}(lhs : Uint256, rhs : Uint256) -> (res : Uint256):',
                '    let (res) =  uint256_sub(lhs, rhs)',
                '    return (res)',
                'end',
            ];
        }
        else {
            return [
                `func warp_sub_signed_unsafe${width}{bitwise_ptr : BitwiseBuiltin*}(`,
                `        lhs : felt, rhs : felt) -> (res : felt):`,
                `    # First sign extend both operands`,
                `    let (left_msb : felt) = bitwise_and(lhs, ${(0, utils_1.msb)(width)})`,
                `    let (right_msb : felt) = bitwise_and(rhs, ${(0, utils_1.msb)(width)})`,
                `    let left_safe : felt = lhs + 2 * left_msb`,
                `    let right_safe : felt = rhs + 2 * right_msb`,
                ``,
                `    # Now safely negate the rhs and add (l - r = l + (-r))`,
                `    let right_neg : felt = ${(0, utils_1.bound)(width + 1)} - right_safe`,
                `    let extended_res : felt = left_safe + right_neg`,
                ``,
                `    # Narrow and return`,
                `    let (res) = bitwise_and(extended_res, ${(0, utils_1.mask)(width)})`,
                `    return (res)`,
                `end`,
            ];
        }
    }));
}
exports.sub_signed_unsafe = sub_signed_unsafe;
//func warp_sub{range_check_ptr}(lhs : felt, rhs : felt) -> (res : felt):
//func warp_sub256{range_check_ptr, bitwise_ptr : BitwiseBuiltin*}(lhs : Uint256, rhs : Uint256) -> (res : Uint256):
function functionaliseSub(node, unsafe, ast) {
    const implicitsFn = (width, signed) => {
        if (signed) {
            if (width === 256)
                return ['range_check_ptr', 'bitwise_ptr'];
            else
                return ['bitwise_ptr'];
        }
        else {
            if (unsafe) {
                return ['bitwise_ptr'];
            }
            else {
                if (width === 256)
                    return ['range_check_ptr', 'bitwise_ptr'];
                else
                    return ['range_check_ptr'];
            }
        }
    };
    const typeNode = (0, solc_typed_ast_1.getNodeType)(node, ast.compilerVersion);
    (0, assert_1.default)(typeNode instanceof solc_typed_ast_1.IntType, `Expected IntType for subtraction, got ${(0, astPrinter_1.printTypeNode)(typeNode)}`);
    if (unsafe) {
        (0, utils_1.IntxIntFunction)(node, 'sub', 'always', true, unsafe, implicitsFn, ast);
    }
    else {
        (0, utils_1.IntxIntFunction)(node, 'sub', 'signedOrWide', true, unsafe, implicitsFn, ast);
    }
}
exports.functionaliseSub = functionaliseSub;
//# sourceMappingURL=sub.js.map