"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageAllocator = void 0;
const assert_1 = __importDefault(require("assert"));
const solc_typed_ast_1 = require("solc-typed-ast");
const cairoNodes_1 = require("../ast/cairoNodes");
const mapper_1 = require("../ast/mapper");
const cairoTypeSystem_1 = require("../utils/cairoTypeSystem");
const cloning_1 = require("../utils/cloning");
const nodeTemplates_1 = require("../utils/nodeTemplates");
const nodeTypeProcessing_1 = require("../utils/nodeTypeProcessing");
const utils_1 = require("../utils/utils");
class StorageAllocator extends mapper_1.ASTMapper {
    // Function to add passes that should have been run before this pass
    addInitialPassPrerequisites() {
        const passKeys = new Set([]);
        passKeys.forEach((key) => this.addPassPrerequisite(key));
    }
    visitContractDefinition(node, ast) {
        const initialisationBlock = (0, nodeTemplates_1.createBlock)([], ast);
        let usedStorage = 0;
        let usedNames = 0;
        const dynamicAllocations = new Map();
        const staticAllocations = new Map();
        node.vStateVariables.forEach((v) => {
            const type = (0, solc_typed_ast_1.getNodeType)(v, ast.compilerVersion);
            if ((0, solc_typed_ast_1.generalizeType)(type)[0] instanceof solc_typed_ast_1.MappingType || (0, nodeTypeProcessing_1.isDynamicArray)(type)) {
                const width = cairoTypeSystem_1.CairoType.fromSol(type, ast, cairoTypeSystem_1.TypeConversionContext.StorageAllocation).width;
                dynamicAllocations.set(v, ++usedNames);
                usedStorage += width;
                extractInitialisation(v, initialisationBlock, ast);
            }
            else if (!(0, utils_1.isCairoConstant)(v)) {
                const width = cairoTypeSystem_1.CairoType.fromSol(type, ast, cairoTypeSystem_1.TypeConversionContext.StorageAllocation).width;
                staticAllocations.set(v, usedStorage);
                usedStorage += width;
                extractInitialisation(v, initialisationBlock, ast);
            }
        });
        insertIntoConstructor(initialisationBlock, node, ast);
        const cairoNode = new cairoNodes_1.CairoContract(node.id, node.src, node.name, node.scope, node.kind, node.abstract, node.fullyImplemented, node.linearizedBaseContracts, node.usedErrors, dynamicAllocations, staticAllocations, usedStorage, usedNames, node.documentation, node.children, node.nameLocation, node.raw);
        if (node.kind === solc_typed_ast_1.ContractKind.Library) {
            // mark all library functions as private
            cairoNode.vFunctions.forEach((f) => {
                f.visibility = solc_typed_ast_1.FunctionVisibility.Private;
            });
        }
        ast.replaceNode(node, cairoNode);
        // This next code line is a hotfix when there is struct inheritance and the base contract's definiton
        // gets replaced by its cairo counter part. From now on using `getNodeType` on an expression with a
        // an inherited struct type will crash unexpectedly.
        // The issue is caused because the property `vLinearizedBaseContracts` that is accessed through `getNodeType`
        // still points to the old contract's non-cairo definition which has it's context set as undefined due to
        // the replacement
        node.context = cairoNode.context;
    }
}
exports.StorageAllocator = StorageAllocator;
function insertIntoConstructor(initialisationBlock, contract, ast) {
    if (contract.kind !== solc_typed_ast_1.ContractKind.Contract)
        return;
    const constructor = contract.vConstructor;
    if (constructor === undefined) {
        const newConstructor = new solc_typed_ast_1.FunctionDefinition(ast.reserveId(), '', contract.id, solc_typed_ast_1.FunctionKind.Constructor, '', false, solc_typed_ast_1.FunctionVisibility.Public, solc_typed_ast_1.FunctionStateMutability.NonPayable, true, (0, nodeTemplates_1.createParameterList)([], ast), (0, nodeTemplates_1.createParameterList)([], ast), [], undefined, initialisationBlock);
        contract.appendChild(newConstructor);
        ast.registerChild(newConstructor, contract);
    }
    else {
        const body = constructor.vBody;
        (0, assert_1.default)(body !== undefined, 'Expected existing constructor to be implemented');
        initialisationBlock.children
            .slice()
            .reverse()
            .forEach((statement) => {
            body.insertAtBeginning(statement);
        });
    }
}
function extractInitialisation(node, initialisationBlock, ast) {
    if (node.vValue === undefined)
        return;
    (0, assert_1.default)(node.vType !== undefined);
    const type = (0, nodeTypeProcessing_1.typeNameToSpecializedTypeNode)(node.vType, solc_typed_ast_1.DataLocation.Storage);
    let value = node.vValue;
    if (value && value instanceof solc_typed_ast_1.Literal && value.kind === solc_typed_ast_1.LiteralKind.String) {
        const memoryVariableDeclaration = (0, cloning_1.cloneASTNode)(node, ast);
        memoryVariableDeclaration.storageLocation = solc_typed_ast_1.DataLocation.Memory;
        memoryVariableDeclaration.name = 'wm_' + memoryVariableDeclaration.name;
        memoryVariableDeclaration.stateVariable = false;
        initialisationBlock.appendChild((0, nodeTemplates_1.createVariableDeclarationStatement)([memoryVariableDeclaration], value, ast));
        value = (0, nodeTemplates_1.createIdentifier)(memoryVariableDeclaration, ast, solc_typed_ast_1.DataLocation.Memory);
    }
    initialisationBlock.appendChild((0, nodeTemplates_1.createExpressionStatement)(ast, new solc_typed_ast_1.Assignment(ast.reserveId(), node.src, type.pp(), '=', (0, nodeTemplates_1.createIdentifier)(node, ast), value)));
    node.vValue = undefined;
}
//# sourceMappingURL=storageAllocator.js.map