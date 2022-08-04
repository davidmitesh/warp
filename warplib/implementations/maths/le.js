"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.functionaliseLe = exports.le_signed = void 0;
const utils_1 = require("../../utils");
function le_signed() {
    (0, utils_1.generateFile)('le_signed', [
        'from starkware.cairo.common.bitwise import bitwise_and',
        'from starkware.cairo.common.cairo_builtins import BitwiseBuiltin',
        'from starkware.cairo.common.math_cmp import is_le_felt',
        'from starkware.cairo.common.uint256 import Uint256, uint256_signed_le',
    ], (0, utils_1.forAllWidths)((width) => {
        if (width === 256) {
            return [
                `func warp_le_signed${width}{range_check_ptr}(lhs : Uint256, rhs : Uint256) -> (res : felt):`,
                '    let (res) = uint256_signed_le(lhs, rhs)',
                '    return (res)',
                'end',
            ];
        }
        else {
            return [
                `func warp_le_signed${width}{bitwise_ptr : BitwiseBuiltin*, range_check_ptr}(`,
                `        lhs : felt, rhs : felt) -> (res : felt):`,
                `    alloc_locals`,
                `    let (lhs_msb : felt) = bitwise_and(lhs, ${(0, utils_1.msb)(width)})`,
                `    let (rhs_msb : felt) = bitwise_and(rhs, ${(0, utils_1.msb)(width)})`,
                `    local bitwise_ptr : BitwiseBuiltin* = bitwise_ptr`,
                `    if lhs_msb == 0:`,
                `        # lhs >= 0`,
                `        if rhs_msb == 0:`,
                `            # rhs >= 0`,
                `            let (result) = is_le_felt(lhs, rhs)`,
                `            return (result)`,
                `        else:`,
                `            # rhs < 0`,
                `            return (0)`,
                `        end`,
                `    else:`,
                `        # lhs < 0`,
                `        if rhs_msb == 0:`,
                `            # rhs >= 0`,
                `            return (1)`,
                `        else:`,
                `            # rhs < 0`,
                `            # (signed) lhs <= rhs <=> (unsigned) lhs >= rhs`,
                `            let (result) = is_le_felt(rhs, lhs)`,
                `            return (result)`,
                `        end`,
                `    end`,
                `end`,
            ];
        }
    }));
}
exports.le_signed = le_signed;
function functionaliseLe(node, ast) {
    const implicitsFn = (wide, signed) => {
        if (!wide && signed)
            return ['range_check_ptr', 'bitwise_ptr'];
        else
            return ['range_check_ptr'];
    };
    (0, utils_1.Comparison)(node, 'le', 'signedOrWide', true, implicitsFn, ast);
}
exports.functionaliseLe = functionaliseLe;
//# sourceMappingURL=le.js.map