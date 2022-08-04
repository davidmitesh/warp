"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mangleContractFilePath = exports.mangleFreeFilePath = exports.SourceUnitSplitter = void 0;
const assert_1 = __importDefault(require("assert"));
const solc_typed_ast_1 = require("solc-typed-ast");
const mapper_1 = require("../ast/mapper");
const cloning_1 = require("../utils/cloning");
const nameModifiers_1 = require("../utils/nameModifiers");
class SourceUnitSplitter extends mapper_1.ASTMapper {
    // Function to add passes that should have been run before this pass
    addInitialPassPrerequisites() {
        const passKeys = new Set([]);
        passKeys.forEach((key) => this.addPassPrerequisite(key));
    }
    static map(ast) {
        ast.roots = ast.roots.flatMap((su) => splitSourceUnit(su, ast));
        return ast;
    }
}
exports.SourceUnitSplitter = SourceUnitSplitter;
function splitSourceUnit(sourceUnit, ast) {
    (0, assert_1.default)(sourceUnit.absolutePath.endsWith('.sol'), "Can't transform files without sol ending");
    const filePathRoot = sourceUnit.absolutePath.slice(0, sourceUnit.absolutePath.length - '.sol'.length);
    const freeSourceUnitId = ast.reserveId();
    const freeSourceSignificantChildren = [
        ...sourceUnit.vEnums,
        ...sourceUnit.vErrors,
        ...sourceUnit.vUserDefinedValueTypes,
        ...updateScope(sourceUnit.vFunctions, freeSourceUnitId),
        ...updateScope(sourceUnit.vVariables, freeSourceUnitId),
        ...updateScope(sourceUnit.vStructs, freeSourceUnitId),
    ];
    const freeSourceChildren = [
        ...sourceUnit.vImportDirectives.map((id) => (0, cloning_1.cloneASTNode)(id, ast)),
        ...freeSourceSignificantChildren,
    ];
    const freeSourceUnit = new solc_typed_ast_1.SourceUnit(freeSourceUnitId, sourceUnit.src, '', 0, mangleFreeFilePath(filePathRoot) + '.sol', sourceUnit.exportedSymbols, freeSourceChildren);
    const units = sourceUnit.vContracts.map((contract) => {
        const contractSourceUnitId = ast.reserveId();
        return new solc_typed_ast_1.SourceUnit(contractSourceUnitId, '', '', 0, mangleContractFilePath(filePathRoot, contract.name) + '.sol', sourceUnit.exportedSymbols, [
            ...sourceUnit.vImportDirectives.map((iD) => (0, cloning_1.cloneASTNode)(iD, ast)),
            ...updateScope([contract], contractSourceUnitId),
        ]);
    });
    const sourceUnits = freeSourceSignificantChildren.length > 0 ? [freeSourceUnit, ...units] : units;
    sourceUnits.forEach((su) => ast.setContextRecursive(su));
    sourceUnits.forEach((su) => sourceUnits
        .filter((isu) => isu.id !== su.id)
        .forEach((importSu) => {
        const iDir = new solc_typed_ast_1.ImportDirective(ast.reserveId(), importSu.src, importSu.absolutePath, importSu.absolutePath, '', getAllSourceUnitDefinitions(importSu).map((node) => ({
            foreign: node.id,
            local: node.name,
        })), su.id, importSu.id);
        su.insertAtBeginning(iDir);
        ast.registerChild(iDir, su);
        //ImportDirective scope should point to current SourceUnit
        importSu.getChildrenByType(solc_typed_ast_1.ImportDirective).forEach((IDNode) => {
            IDNode.scope = importSu.id;
        });
    }));
    return sourceUnits;
}
function updateScope(nodes, newScope) {
    nodes.forEach((node) => (node.scope = newScope));
    return nodes;
}
function mangleFreeFilePath(path) {
    return `${path}${nameModifiers_1.FREE_FILE_SUFFIX}`;
}
exports.mangleFreeFilePath = mangleFreeFilePath;
function mangleContractFilePath(path, contractName) {
    return `${path}${nameModifiers_1.CONTRACT_INFIX}${contractName}`;
}
exports.mangleContractFilePath = mangleContractFilePath;
function getAllSourceUnitDefinitions(sourceUnit) {
    return [
        ...sourceUnit.vContracts,
        ...sourceUnit.vStructs,
        ...sourceUnit.vVariables,
        ...sourceUnit.vFunctions,
        ...sourceUnit.vVariables,
        ...sourceUnit.vUserDefinedValueTypes,
        ...sourceUnit.vEnums,
        ...sourceUnit.vErrors,
    ];
}
//# sourceMappingURL=sourceUnitSplitter.js.map