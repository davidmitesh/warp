"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.functionaliseMod = exports.mod_signed = void 0;
const utils_1 = require("../../../utils/utils");
const utils_2 = require("../../utils");
function mod_signed() {
    (0, utils_2.generateFile)('mod_signed', [
        'from starkware.cairo.common.bitwise import bitwise_and',
        'from starkware.cairo.common.cairo_builtins import BitwiseBuiltin',
        'from starkware.cairo.common.uint256 import Uint256, uint256_signed_div_rem',
        'from warplib.maths.utils import felt_to_uint256',
        `from warplib.maths.int_conversions import ${(0, utils_1.mapRange)(31, (n) => `warp_int${8 * n + 8}_to_int256`).join(', ')}, ${(0, utils_1.mapRange)(31, (n) => `warp_int256_to_int${8 * n + 8}`).join(', ')}`,
    ], (0, utils_2.forAllWidths)((width) => {
        if (width === 256) {
            return [
                'func warp_mod_signed256{range_check_ptr}(lhs : Uint256, rhs : Uint256) -> (res : Uint256):',
                `    if rhs.high == 0:`,
                `       if rhs.low == 0:`,
                `           with_attr error_message("Modulo by zero error"):`,
                `             assert 1 = 0`,
                `           end`,
                `       end`,
                `    end`,
                '    let (_, res : Uint256) = uint256_signed_div_rem(lhs, rhs)',
                '    return (res)',
                'end',
            ];
        }
        else {
            return [
                `func warp_mod_signed${width}{range_check_ptr, bitwise_ptr: BitwiseBuiltin*}(lhs : felt, rhs : felt) -> (res : felt):`,
                `    alloc_locals`,
                `    if rhs == 0:`,
                `        with_attr error_message("Modulo by zero error"):`,
                `            assert 1 = 0`,
                `        end`,
                `    end`,
                `    let (local lhs_256) = warp_int${width}_to_int256(lhs)`,
                `    let (rhs_256) = warp_int${width}_to_int256(rhs)`,
                '    let (_, res256) = uint256_signed_div_rem(lhs_256, rhs_256)',
                `    let (truncated) = warp_int256_to_int${width}(res256)`,
                `    return (truncated)`,
                'end',
            ];
        }
    }));
}
exports.mod_signed = mod_signed;
function functionaliseMod(node, ast) {
    const implicits = (width, signed) => {
        if (width !== 256 && signed)
            return ['range_check_ptr', 'bitwise_ptr'];
        return ['range_check_ptr'];
    };
    (0, utils_2.IntxIntFunction)(node, 'mod', 'signedOrWide', true, false, implicits, ast);
}
exports.functionaliseMod = functionaliseMod;
//# sourceMappingURL=mod.js.map