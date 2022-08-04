"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.genContractInterface = exports.getTemporaryInterfaceName = exports.ExternalContractInterfaceInserter = void 0;
const assert = require("assert");
const solc_typed_ast_1 = require("solc-typed-ast");
const mapper_1 = require("../../ast/mapper");
const cloning_1 = require("../../utils/cloning");
const utils_1 = require("../../utils/utils");
class ExternalContractInterfaceInserter extends mapper_1.ASTMapper {
    /*
      This is a sort of pass which goes through every variable declaration/function call/member access
      and identifies the external contracts that are being used. It then creates a new contract interface
      for each of those contracts and inserts it into the AST.
    */
    constructor(contractInterfaces) {
        super();
        this.contractInterfaces = contractInterfaces;
    }
    visitIdentifier(node, ast) {
        const declaration = node.vReferencedDeclaration;
        if (declaration === undefined)
            return;
        if (declaration instanceof solc_typed_ast_1.ContractDefinition) {
            importExternalContract(declaration, node.getClosestParentByType(solc_typed_ast_1.SourceUnit), this.contractInterfaces, ast);
        }
    }
    visitMemberAccess(node, ast) {
        const nodeType = (0, solc_typed_ast_1.getNodeType)(node.vExpression, ast.compilerVersion);
        if (nodeType instanceof solc_typed_ast_1.UserDefinedType && nodeType.definition instanceof solc_typed_ast_1.ContractDefinition) {
            importExternalContract(nodeType.definition, node.getClosestParentByType(solc_typed_ast_1.SourceUnit), this.contractInterfaces, ast);
        }
        this.commonVisit(node, ast);
    }
    visitVariableDeclaration(node, ast) {
        const varType = node.vType;
        if (!varType)
            return;
        if (varType instanceof solc_typed_ast_1.UserDefinedTypeName &&
            varType.vReferencedDeclaration instanceof solc_typed_ast_1.ContractDefinition) {
            importExternalContract(varType.vReferencedDeclaration, node.getClosestParentByType(solc_typed_ast_1.SourceUnit), this.contractInterfaces, ast);
        }
    }
}
exports.ExternalContractInterfaceInserter = ExternalContractInterfaceInserter;
function importExternalContract(contract, sourceUnit, contractInterfaces, ast) {
    assert(sourceUnit !== undefined, 'Trying to import a definition into an unknown source unit');
    if (contract.kind === solc_typed_ast_1.ContractKind.Library)
        return;
    if (contractInterfaces.has(contract.id))
        return;
    contractInterfaces.set(contract.id, genContractInterface(contract, sourceUnit, ast));
}
function getTemporaryInterfaceName(contractName) {
    return `${contractName}@interface`;
}
exports.getTemporaryInterfaceName = getTemporaryInterfaceName;
function genContractInterface(contract, sourceUnit, ast) {
    const contractId = ast.reserveId();
    const contractInterface = new solc_typed_ast_1.ContractDefinition(contractId, '', 
    // `@interface` is a workaround to avoid the conflict with
    // the existing contract with the same name
    getTemporaryInterfaceName(contract.name), sourceUnit.id, solc_typed_ast_1.ContractKind.Interface, contract.abstract, false, contract.linearizedBaseContracts, contract.usedErrors);
    contract.vFunctions
        .filter((func) => func.kind !== solc_typed_ast_1.FunctionKind.Constructor && (0, utils_1.isExternallyVisible)(func))
        .forEach((func) => {
        const funcBody = func.vBody;
        func.vBody = undefined;
        const funcClone = (0, cloning_1.cloneASTNode)(func, ast);
        funcClone.scope = contractId;
        funcClone.implemented = false;
        func.vBody = funcBody;
        contractInterface.appendChild(funcClone);
        ast.registerChild(funcClone, contractInterface);
    });
    sourceUnit.appendChild(contractInterface);
    ast.registerChild(contractInterface, sourceUnit);
    return contractInterface;
}
exports.genContractInterface = genContractInterface;
//# sourceMappingURL=externalContractInterfaceInserter.js.map