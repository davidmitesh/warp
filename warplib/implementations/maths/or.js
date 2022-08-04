"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.functionaliseOr = void 0;
const utils_1 = require("../../utils");
function functionaliseOr(node, ast) {
    (0, utils_1.BoolxBoolFunction)(node, 'or', ast);
}
exports.functionaliseOr = functionaliseOr;
//# sourceMappingURL=or.js.map