"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.functionaliseAdd = exports.add_signed_unsafe = exports.add_signed = exports.add_unsafe = exports.add = void 0;
const utils_1 = require("../../utils");
function add() {
    (0, utils_1.generateFile)('add', [
        'from starkware.cairo.common.math_cmp import is_le_felt',
        'from starkware.cairo.common.uint256 import Uint256, uint256_add',
    ], (0, utils_1.forAllWidths)((width) => {
        if (width === 256) {
            return [
                `func warp_add256{range_check_ptr}(lhs : Uint256, rhs : Uint256) -> (res : Uint256):`,
                `    let (res : Uint256, carry : felt) = uint256_add(lhs, rhs)`,
                `    assert carry = 0`,
                `    return (res)`,
                `end`,
            ];
        }
        else {
            return [
                `func warp_add${width}{range_check_ptr}(lhs : felt, rhs : felt) -> (res : felt):`,
                `    let res = lhs + rhs`,
                `    let (inRange : felt) = is_le_felt(res, ${(0, utils_1.mask)(width)})`,
                `    assert inRange = 1`,
                `    return (res)`,
                `end`,
            ];
        }
    }));
}
exports.add = add;
function add_unsafe() {
    (0, utils_1.generateFile)('add_unsafe', [
        'from starkware.cairo.common.bitwise import bitwise_and',
        'from starkware.cairo.common.cairo_builtins import BitwiseBuiltin',
        'from starkware.cairo.common.math_cmp import is_le_felt',
        'from starkware.cairo.common.uint256 import Uint256, uint256_add',
    ], (0, utils_1.forAllWidths)((width) => {
        if (width === 256) {
            return [
                `func warp_add_unsafe256{range_check_ptr}(lhs : Uint256, rhs : Uint256) -> (res : Uint256):`,
                `    let (res : Uint256, _) = uint256_add(lhs, rhs)`,
                `    return (res)`,
                `end`,
            ];
        }
        else {
            return [
                `func warp_add_unsafe${width}{bitwise_ptr : BitwiseBuiltin*}(lhs : felt, rhs : felt) -> (`,
                `        res : felt):`,
                `    let (res) = bitwise_and(lhs + rhs, ${(0, utils_1.mask)(width)})`,
                `    return (res)`,
                `end`,
            ];
        }
    }));
}
exports.add_unsafe = add_unsafe;
function add_signed() {
    (0, utils_1.generateFile)('add_signed', [
        'from starkware.cairo.common.bitwise import bitwise_and',
        'from starkware.cairo.common.cairo_builtins import BitwiseBuiltin',
        'from starkware.cairo.common.math_cmp import is_le_felt',
        'from starkware.cairo.common.uint256 import Uint256, uint256_add',
    ], (0, utils_1.forAllWidths)((width) => {
        if (width === 256) {
            return [
                `func warp_add_signed256{range_check_ptr, bitwise_ptr : BitwiseBuiltin*}(`,
                `        lhs : Uint256, rhs : Uint256) -> (res : Uint256):`,
                `    let (lhs_extend) = bitwise_and(lhs.high, ${(0, utils_1.msb)(128)})`,
                `    let (rhs_extend) = bitwise_and(rhs.high, ${(0, utils_1.msb)(128)})`,
                `    let (res : Uint256, carry : felt) = uint256_add(lhs, rhs)`,
                `    let carry_extend = lhs_extend + rhs_extend + carry*${(0, utils_1.msb)(128)}`,
                `    let (msb) = bitwise_and(res.high, ${(0, utils_1.msb)(128)})`,
                `    let (carry_lsb) = bitwise_and(carry_extend, ${(0, utils_1.msb)(128)})`,
                `    assert msb = carry_lsb`,
                `    return (res)`,
                `end`,
            ];
        }
        else {
            return [
                `func warp_add_signed${width}{bitwise_ptr : BitwiseBuiltin*}(lhs : felt, rhs : felt) -> (`,
                `        res : felt):`,
                `# Do the addition sign extended`,
                `    let (lmsb) = bitwise_and(lhs, ${(0, utils_1.msb)(width)})`,
                `    let (rmsb) = bitwise_and(rhs, ${(0, utils_1.msb)(width)})`,
                `    let big_res = lhs + rhs + 2*(lmsb+rmsb)`,
                `# Check the result is valid`,
                `    let (overflowBits) = bitwise_and(big_res,  ${(0, utils_1.msbAndNext)(width)})`,
                `    assert overflowBits * (overflowBits - ${(0, utils_1.msbAndNext)(width)}) = 0`,
                `# Truncate and return`,
                `    let (res) =  bitwise_and(big_res, ${(0, utils_1.mask)(width)})`,
                `    return (res)`,
                `end`,
            ];
        }
    }));
}
exports.add_signed = add_signed;
function add_signed_unsafe() {
    (0, utils_1.generateFile)('add_signed_unsafe', [
        'from starkware.cairo.common.bitwise import bitwise_and',
        'from starkware.cairo.common.cairo_builtins import BitwiseBuiltin',
        'from starkware.cairo.common.math_cmp import is_le_felt',
        'from starkware.cairo.common.uint256 import Uint256, uint256_add',
    ], (0, utils_1.forAllWidths)((width) => {
        if (width === 256) {
            return [
                `func warp_add_signed_unsafe256{range_check_ptr}(lhs : Uint256, rhs : Uint256) -> (res : Uint256):`,
                `    let (res : Uint256, _) = uint256_add(lhs, rhs)`,
                `    return (res)`,
                `end`,
            ];
        }
        else {
            return [
                `func warp_add_signed_unsafe${width}{bitwise_ptr : BitwiseBuiltin*}(`,
                `        lhs : felt, rhs : felt) -> (res : felt):`,
                `    let (res) = bitwise_and(lhs + rhs, ${(0, utils_1.mask)(width)})`,
                `    return (res)`,
                `end`,
            ];
        }
    }));
}
exports.add_signed_unsafe = add_signed_unsafe;
function functionaliseAdd(node, unsafe, ast) {
    const implicitsFn = (width, signed) => {
        if (!unsafe && signed && width === 256)
            return ['range_check_ptr', 'bitwise_ptr'];
        else if ((!unsafe && !signed) || width === 256)
            return ['range_check_ptr'];
        else
            return ['bitwise_ptr'];
    };
    (0, utils_1.IntxIntFunction)(node, 'add', 'always', true, unsafe, implicitsFn, ast);
}
exports.functionaliseAdd = functionaliseAdd;
//# sourceMappingURL=add.js.map