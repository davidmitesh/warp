"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.functionaliseBitwiseOr = void 0;
const utils_1 = require("../../utils");
function functionaliseBitwiseOr(node, ast) {
    const implicitsFn = (width) => {
        if (width === 256)
            return ['range_check_ptr', 'bitwise_ptr'];
        else
            return ['bitwise_ptr'];
    };
    (0, utils_1.IntxIntFunction)(node, 'bitwise_or', 'only256', false, false, implicitsFn, ast);
}
exports.functionaliseBitwiseOr = functionaliseBitwiseOr;
//# sourceMappingURL=bitwise_or.js.map