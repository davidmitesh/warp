"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.functionaliseBitwiseNot = exports.bitwise_not = void 0;
const utils_1 = require("../../utils");
function bitwise_not() {
    (0, utils_1.generateFile)('bitwise_not', [
        'from starkware.cairo.common.bitwise import bitwise_xor',
        'from starkware.cairo.common.cairo_builtins import BitwiseBuiltin',
        'from starkware.cairo.common.uint256 import Uint256, uint256_not',
    ], (0, utils_1.forAllWidths)((width) => {
        if (width === 256) {
            return [
                'func warp_bitwise_not256{range_check_ptr}(op : Uint256) -> (res : Uint256):',
                '    let (res) = uint256_not(op)',
                '    return (res)',
                'end',
            ];
        }
        else {
            return [
                `func warp_bitwise_not${width}{bitwise_ptr : BitwiseBuiltin*}(op : felt) -> (res : felt):`,
                `    let (res) = bitwise_xor(op, ${(0, utils_1.mask)(width)})`,
                `    return (res)`,
                'end',
            ];
        }
    }));
}
exports.bitwise_not = bitwise_not;
function functionaliseBitwiseNot(node, ast) {
    const implicitsFn = (wide) => {
        if (wide)
            return ['range_check_ptr'];
        else
            return ['bitwise_ptr'];
    };
    (0, utils_1.IntFunction)(node, node.vSubExpression, 'bitwise_not', 'bitwise_not', implicitsFn, ast);
}
exports.functionaliseBitwiseNot = functionaliseBitwiseNot;
//# sourceMappingURL=bitwise_not.js.map