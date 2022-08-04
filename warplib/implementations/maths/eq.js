"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.functionaliseEq = void 0;
const utils_1 = require("../../utils");
function functionaliseEq(node, ast) {
    const implicitsFn = (wide) => {
        if (wide)
            return ['range_check_ptr'];
        return [];
    };
    (0, utils_1.Comparison)(node, 'eq', 'only256', false, implicitsFn, ast);
}
exports.functionaliseEq = functionaliseEq;
//# sourceMappingURL=eq.js.map