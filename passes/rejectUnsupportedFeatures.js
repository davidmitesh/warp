"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RejectUnsupportedFeatures = void 0;
const solc_typed_ast_1 = require("solc-typed-ast");
const mapper_1 = require("../ast/mapper");
const astPrinter_1 = require("../utils/astPrinter");
const errors_1 = require("../utils/errors");
const nodeTypeProcessing_1 = require("../utils/nodeTypeProcessing");
const utils_1 = require("../utils/utils");
class RejectUnsupportedFeatures extends mapper_1.ASTMapper {
    // Function to add passes that should have been run before this pass
    addInitialPassPrerequisites() {
        const passKeys = new Set([]);
        passKeys.forEach((key) => this.addPassPrerequisite(key));
    }
    visitIndexAccess(node, ast) {
        if (node.vIndexExpression === undefined) {
            throw new errors_1.WillNotSupportError(`Undefined index access not supported. Is this in abi.decode?`, node);
        }
        this.visitExpression(node, ast);
    }
    visitInlineAssembly(node, _ast) {
        throw new errors_1.WillNotSupportError('Yul blocks are not supported', node);
    }
    visitRevertStatement(node, _ast) {
        throw new errors_1.WillNotSupportError('Reverts with custom errors are not supported', node);
    }
    visitErrorDefinition(node, _ast) {
        throw new errors_1.WillNotSupportError('User defined Errors are not supported', node);
    }
    visitConditional(node, _ast) {
        throw new errors_1.WillNotSupportError('Conditional expressions (ternary operator, node) are not supported', node);
    }
    visitFunctionCallOptions(node, ast) {
        // Allow options only when passing salt values for contract creation
        if (node.parent instanceof solc_typed_ast_1.FunctionCall &&
            node.parent.typeString.startsWith('contract') &&
            [...node.vOptionsMap.entries()].length === 1 &&
            node.vOptionsMap.has('salt')) {
            return this.visitExpression(node, ast);
        }
        throw new errors_1.WillNotSupportError('Function call options (other than `salt` when creating a contract), such as {gas:X} and {value:X} are not supported', node);
    }
    visitVariableDeclaration(node, ast) {
        const typeNode = (0, solc_typed_ast_1.getNodeType)(node, ast.compilerVersion);
        if (typeNode instanceof solc_typed_ast_1.FunctionType)
            throw new errors_1.WillNotSupportError('Function objects are not supported', node);
        this.commonVisit(node, ast);
    }
    visitExpressionStatement(node, ast) {
        const typeNode = (0, solc_typed_ast_1.getNodeType)(node.vExpression, ast.compilerVersion);
        if (typeNode instanceof solc_typed_ast_1.FunctionType)
            throw new errors_1.WillNotSupportError('Function objects are not supported', node);
        this.commonVisit(node, ast);
    }
    visitIdentifier(node, _ast) {
        if (node.name === 'msg' && node.vIdentifierType === solc_typed_ast_1.ExternalReferenceType.Builtin) {
            if (!(node.parent instanceof solc_typed_ast_1.MemberAccess && node.parent.memberName === 'sender')) {
                throw new errors_1.WillNotSupportError(`msg object not supported outside of 'msg.sender'`, node);
            }
        }
    }
    visitMemberAccess(node, ast) {
        if (!((0, solc_typed_ast_1.getNodeType)(node.vExpression, ast.compilerVersion) instanceof solc_typed_ast_1.AddressType)) {
            this.visitExpression(node, ast);
            return;
        }
        const members = [
            'balance',
            'code',
            'codehash',
            'transfer',
            'send',
            'call',
            'delegatecall',
            'staticcall',
        ];
        if (members.includes(node.memberName))
            throw new errors_1.WillNotSupportError(`Members of addresses are not supported. Found at ${(0, astPrinter_1.printNode)(node)}`, node);
        this.visitExpression(node, ast);
    }
    visitParameterList(node, ast) {
        // any of node.vParameters has indexed flag true then throw error
        if (node.vParameters.some((param) => param.indexed)) {
            throw new errors_1.WillNotSupportError(`Indexed parameters are not supported`, node);
        }
        this.commonVisit(node, ast);
    }
    visitFunctionCall(node, ast) {
        const unsupportedMath = ['sha256', 'ripemd160'];
        const unsupportedAbi = [
            'decode',
            'encode',
            'encodePacked',
            'encodeWithSelector',
            'encodeWithSignature',
            'encodeCall',
        ];
        const unsupportedMisc = ['blockhash', 'selfdestruct'];
        const funcName = node.vFunctionName;
        if (node.kind === solc_typed_ast_1.FunctionCallKind.FunctionCall &&
            node.vReferencedDeclaration === undefined &&
            [...unsupportedMath, ...unsupportedAbi, ...unsupportedMisc].includes(funcName)) {
            throw new errors_1.WillNotSupportError(`Solidity builtin ${funcName} is not supported`, node);
        }
        this.visitExpression(node, ast);
    }
    visitFunctionDefinition(node, ast) {
        if (!(node.vScope instanceof solc_typed_ast_1.ContractDefinition && node.vScope.kind === solc_typed_ast_1.ContractKind.Library)) {
            [...node.vParameters.vParameters, ...node.vReturnParameters.vParameters].forEach((decl) => {
                const type = (0, solc_typed_ast_1.getNodeType)(decl, ast.compilerVersion);
                functionArgsCheck(type, ast, (0, utils_1.isExternallyVisible)(node), decl.storageLocation, node);
            });
        }
        if (node.kind === solc_typed_ast_1.FunctionKind.Fallback) {
            if (node.vParameters.vParameters.length > 0)
                throw new errors_1.WillNotSupportError(`${node.kind} with arguments is not supported`, node);
        }
        else if (node.kind === solc_typed_ast_1.FunctionKind.Receive) {
            throw new errors_1.WillNotSupportError(`Receive functions are not supported`, node);
        }
        this.commonVisit(node, ast);
    }
    visitTryStatement(node, _ast) {
        throw new errors_1.WillNotSupportError(`Try/Catch statements are not supported`, node);
    }
}
exports.RejectUnsupportedFeatures = RejectUnsupportedFeatures;
// Cases not allowed:
// Dynarray inside structs to/from external functions
// Dynarray inside dynarray to/from external functions
// Dynarray as direct child of static array to/from external functions
function functionArgsCheck(type, ast, externallyVisible, dataLocation, node) {
    if (type instanceof solc_typed_ast_1.UserDefinedType && type.definition instanceof solc_typed_ast_1.StructDefinition) {
        if (externallyVisible && findDynArrayRecursive(type, ast)) {
            throw new errors_1.WillNotSupportError(`Dynamic arrays are not allowed as (indirect) children of structs passed to/from external functions`, node);
        }
        type.definition.vMembers.forEach((member) => functionArgsCheck((0, solc_typed_ast_1.getNodeType)(member, ast.compilerVersion), ast, externallyVisible, dataLocation, member));
    }
    else if (type instanceof solc_typed_ast_1.ArrayType && type.size === undefined) {
        if (externallyVisible && findDynArrayRecursive(type.elementT, ast)) {
            throw new errors_1.WillNotSupportError(`Dynamic arrays are not allowed as (indirect) children of dynamic arrays passed to/from external functions`);
        }
        functionArgsCheck(type.elementT, ast, externallyVisible, dataLocation, node);
    }
    else if (type instanceof solc_typed_ast_1.ArrayType) {
        if ((0, nodeTypeProcessing_1.isDynamicArray)(type.elementT)) {
            throw new errors_1.WillNotSupportError(`Dynamic arrays are not allowed as children of static arrays passed to/from external functions`);
        }
        functionArgsCheck(type.elementT, ast, externallyVisible, dataLocation, node);
    }
}
// Returns whether the given type is a dynamic array, or contains one
function findDynArrayRecursive(type, ast) {
    if ((0, nodeTypeProcessing_1.isDynamicArray)(type))
        return true;
    if (type instanceof solc_typed_ast_1.PointerType) {
        return findDynArrayRecursive(type.to, ast);
    }
    else if (type instanceof solc_typed_ast_1.ArrayType) {
        return findDynArrayRecursive(type.elementT, ast);
    }
    else if (type instanceof solc_typed_ast_1.BytesType) {
        return true;
    }
    else if (type instanceof solc_typed_ast_1.UserDefinedType && type.definition instanceof solc_typed_ast_1.StructDefinition) {
        return type.definition.vMembers.some((member) => findDynArrayRecursive((0, solc_typed_ast_1.getNodeType)(member, ast.compilerVersion), ast));
    }
    else {
        return false;
    }
}
//# sourceMappingURL=rejectUnsupportedFeatures.js.map