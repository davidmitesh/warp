"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PassOrderError = exports.TranspileFailedError = exports.NotSupportedYetError = exports.WillNotSupportError = exports.TranspilationAbandonedError = exports.CLIError = exports.logError = void 0;
const fs_1 = __importDefault(require("fs"));
const solc_typed_ast_1 = require("solc-typed-ast");
const formatting_1 = require("./formatting");
const utils_1 = require("./utils");
function logError(message) {
    console.error((0, formatting_1.error)(message));
}
exports.logError = logError;
class CLIError extends Error {
    constructor(message) {
        super((0, formatting_1.error)(message));
    }
}
exports.CLIError = CLIError;
class TranspilationAbandonedError extends Error {
    constructor(message, node) {
        super(`${(0, formatting_1.error)(message)}${`\n\n${getSourceCode(node)}\n`}`);
    }
}
exports.TranspilationAbandonedError = TranspilationAbandonedError;
function getSourceCode(node) {
    if (node === undefined)
        return '';
    const sourceUnit = node.getClosestParentByType(solc_typed_ast_1.SourceUnit);
    if (sourceUnit === undefined)
        return '';
    const filePath = sourceUnit.absolutePath;
    if (fs_1.default.existsSync(filePath)) {
        const content = fs_1.default.readFileSync(filePath, { encoding: 'utf-8' });
        return [
            `File ${filePath}:\n`,
            ...(0, utils_1.getSourceFromLocation)(content, (0, solc_typed_ast_1.parseSourceLocation)(node.src))
                .split('\n')
                .map((l) => `\t${l}`),
        ].join('\n');
    }
    else {
        return '';
    }
}
// For features that will not be supported unless Cairo changes to make implementing them feasible
class WillNotSupportError extends TranspilationAbandonedError {
}
exports.WillNotSupportError = WillNotSupportError;
class NotSupportedYetError extends TranspilationAbandonedError {
}
exports.NotSupportedYetError = NotSupportedYetError;
class TranspileFailedError extends TranspilationAbandonedError {
}
exports.TranspileFailedError = TranspileFailedError;
class PassOrderError extends TranspilationAbandonedError {
}
exports.PassOrderError = PassOrderError;
//# sourceMappingURL=errors.js.map