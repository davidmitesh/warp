"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.external_input_check_ints = void 0;
const utils_1 = require("../../utils");
const INDENT = ' '.repeat(4);
const import_strings = [
    'from starkware.cairo.common.math_cmp import is_le_felt',
    'from starkware.cairo.common.uint256 import Uint256',
];
const BitBoundChecker = [
    ...(0, utils_1.forAllWidths)((int_width) => {
        if (int_width == 256) {
            return [
                `func warp_external_input_check_int256{range_check_ptr}(x : Uint256):`,
                `${INDENT}alloc_locals`,
                `${INDENT}let (inRangeHigh : felt) = is_le_felt(x.high, ${(0, utils_1.mask)(128)})`,
                `${INDENT}let (inRangeLow : felt) = is_le_felt(x.low, ${(0, utils_1.mask)(128)})`,
                `${INDENT}with_attr error_message("Error: value out-of-bounds. Values passed to high and low members of Uint256 must be less than 2**128."):`,
                `${INDENT.repeat(2)}assert 1 = (inRangeHigh * inRangeLow)`,
                `${INDENT}end`,
                `${INDENT}return()`,
                `end\n`,
            ];
        }
        else {
            return [
                `func warp_external_input_check_int${int_width}{range_check_ptr}(x : felt):`,
                `${INDENT}let (inRange : felt) = is_le_felt(x, ${(0, utils_1.mask)(int_width)})`,
                `${INDENT}with_attr error_message("Error: value out-of-bounds. Value must be less than 2**${int_width}."):`,
                `${INDENT.repeat(2)}assert 1 = inRange`,
                `${INDENT}end`,
                `${INDENT}return ()`,
                `end\n`,
            ];
        }
    }),
];
function external_input_check_ints() {
    (0, utils_1.generateFile)('external_input_check_ints', import_strings, [...BitBoundChecker]);
}
exports.external_input_check_ints = external_input_check_ints;
//# sourceMappingURL=external_input_checks_ints.js.map