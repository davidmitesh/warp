"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.functionaliseGe = exports.ge_signed = void 0;
const utils_1 = require("../../../utils/utils");
const utils_2 = require("../../utils");
function ge_signed() {
    (0, utils_2.generateFile)('ge_signed', [
        'from starkware.cairo.common.bitwise import bitwise_and',
        'from starkware.cairo.common.cairo_builtins import BitwiseBuiltin',
        'from starkware.cairo.common.uint256 import Uint256, uint256_signed_le',
        `from warplib.maths.lt_signed import ${(0, utils_1.mapRange)(31, (n) => `warp_le_signed${8 * n + 8}`).join(', ')}`,
    ], (0, utils_2.forAllWidths)((width) => {
        if (width === 256) {
            return [
                'func warp_ge_signed256{range_check_ptr}(lhs : Uint256, rhs : Uint256) -> (res : felt):',
                '     let (res) =  uint256_signed_le(rhs, lhs)',
                '     return (res)',
                'end',
            ];
        }
        else {
            return [
                `func warp_ge_signed${width}{bitwise_ptr : BitwiseBuiltin*, range_check_ptr}(`,
                '        lhs : felt, rhs : felt) -> (res : felt):',
                `    let (res) = warp_le_signed${width}(rhs, lhs)`,
                `    return (res)`,
                'end',
            ];
        }
    }));
}
exports.ge_signed = ge_signed;
function functionaliseGe(node, ast) {
    const implicitsFn = (wide, signed) => {
        if (wide || !signed)
            return ['range_check_ptr'];
        else
            return ['range_check_ptr', 'bitwise_ptr'];
    };
    (0, utils_2.Comparison)(node, 'ge', 'signedOrWide', true, implicitsFn, ast);
}
exports.functionaliseGe = functionaliseGe;
//# sourceMappingURL=ge.js.map