"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.functionaliseLt = exports.lt_signed = void 0;
const utils_1 = require("../../../utils/utils");
const utils_2 = require("../../utils");
function lt_signed() {
    (0, utils_2.generateFile)('lt_signed', [
        'from starkware.cairo.common.cairo_builtins import BitwiseBuiltin',
        'from starkware.cairo.common.uint256 import Uint256, uint256_signed_lt',
        'from warplib.maths.utils import felt_to_uint256',
        `from warplib.maths.le_signed import ${(0, utils_1.mapRange)(31, (n) => `warp_le_signed${8 * n + 8}`).join(', ')}`,
    ], (0, utils_2.forAllWidths)((width) => {
        if (width === 256) {
            return [
                'func warp_lt_signed256{range_check_ptr}(lhs : Uint256, rhs : Uint256) -> (res : felt):',
                '    let (res) = uint256_signed_lt(lhs, rhs)',
                '    return (res)',
                'end',
            ];
        }
        else {
            return [
                `func warp_lt_signed${width}{bitwise_ptr : BitwiseBuiltin*, range_check_ptr}(`,
                '        lhs : felt, rhs : felt) -> (res : felt):',
                '    if lhs == rhs:',
                '        return (0)',
                '    end',
                `    let (res) = warp_le_signed${width}(lhs, rhs)`,
                `    return (res)`,
                'end',
            ];
        }
    }));
}
exports.lt_signed = lt_signed;
function functionaliseLt(node, ast) {
    const implicitsFn = (wide, signed) => {
        if (!wide && signed)
            return ['range_check_ptr', 'bitwise_ptr'];
        else
            return ['range_check_ptr'];
    };
    (0, utils_2.Comparison)(node, 'lt', 'signedOrWide', true, implicitsFn, ast);
}
exports.functionaliseLt = functionaliseLt;
//# sourceMappingURL=lt.js.map