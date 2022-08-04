"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.functionaliseNeq = void 0;
const utils_1 = require("../../utils");
function functionaliseNeq(node, ast) {
    const implicitsFn = (wide) => {
        if (wide)
            return ['range_check_ptr'];
        else
            return [];
    };
    (0, utils_1.Comparison)(node, 'neq', 'only256', false, implicitsFn, ast);
}
exports.functionaliseNeq = functionaliseNeq;
//# sourceMappingURL=neq.js.map