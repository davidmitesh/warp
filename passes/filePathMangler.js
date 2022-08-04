"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FilePathMangler = exports.checkPath = exports.manglePath = void 0;
const mapper_1 = require("../ast/mapper");
const errors_1 = require("../utils/errors");
const PATH_REGEX = /^[\w-/\\]*$/;
function manglePath(path) {
    return path.replaceAll('_', '__').replaceAll('-', '_');
}
exports.manglePath = manglePath;
function checkPath(path) {
    const pathWithoutExtension = path.substring(0, path.length - '.sol'.length);
    if (!PATH_REGEX.test(pathWithoutExtension)) {
        throw new errors_1.WillNotSupportError('File path includes unsupported characters, only _, -, /, , and alphanumeric characters are supported');
    }
}
exports.checkPath = checkPath;
class FilePathMangler extends mapper_1.ASTMapper {
    // Function to add passes that should have been run before this pass
    addInitialPassPrerequisites() {
        const passKeys = new Set([]);
        passKeys.forEach((key) => this.addPassPrerequisite(key));
    }
    visitImportDirective(node, _) {
        node.absolutePath = manglePath(node.absolutePath);
    }
    visitSourceUnit(node, ast) {
        checkPath(node.absolutePath);
        this.commonVisit(node, ast);
        node.absolutePath = manglePath(node.absolutePath);
    }
}
exports.FilePathMangler = FilePathMangler;
//# sourceMappingURL=filePathMangler.js.map