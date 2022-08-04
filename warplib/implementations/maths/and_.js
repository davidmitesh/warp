"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.functionaliseAnd = void 0;
const utils_1 = require("../../utils");
function functionaliseAnd(node, ast) {
    (0, utils_1.BoolxBoolFunction)(node, 'and_', ast);
}
exports.functionaliseAnd = functionaliseAnd;
//# sourceMappingURL=and_.js.map