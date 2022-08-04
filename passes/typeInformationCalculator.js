"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TypeInformationCalculator = void 0;
const assert_1 = __importDefault(require("assert"));
const solc_typed_ast_1 = require("solc-typed-ast");
const abi_1 = require("solc-typed-ast/dist/types/abi");
const mapper_1 = require("../ast/mapper");
const astPrinter_1 = require("../utils/astPrinter");
const errors_1 = require("../utils/errors");
const nodeTemplates_1 = require("../utils/nodeTemplates");
function calculateIntMin(type) {
    if (type.signed) {
        return 2n ** BigInt(type.nBits - 1);
    }
    else {
        return 0n;
    }
}
function calculateIntMax(type) {
    if (type.signed) {
        return 2n ** BigInt(type.nBits - 1) - 1n;
    }
    else {
        return 2n ** BigInt(type.nBits) - 1n;
    }
}
function createEnumMemberAccess(outerTypeString, innerTypeString, enumDef, member, ast) {
    return new solc_typed_ast_1.MemberAccess(ast.reserveId(), '', outerTypeString, new solc_typed_ast_1.Identifier(ast.reserveId(), '', innerTypeString, enumDef.name, enumDef.id), member.name, member.id);
}
class TypeInformationCalculator extends mapper_1.ASTMapper {
    // Function to add passes that should have been run before this pass
    addInitialPassPrerequisites() {
        const passKeys = new Set([]);
        passKeys.forEach((key) => this.addPassPrerequisite(key));
    }
    visitMemberAccess(node, ast) {
        if (!node.vExpression.typeString.startsWith('type(') ||
            !(node.vExpression instanceof solc_typed_ast_1.FunctionCall)) {
            return this.visitExpression(node.vExpression, ast);
        }
        const argNode = node.vExpression.vArguments[0];
        const replaceNode = this.getReplacement(argNode, node.memberName, node.typeString, ast);
        if (replaceNode !== null) {
            ast.replaceNode(node, replaceNode);
        }
    }
    getReplacement(node, memberName, typestring, ast) {
        let nodeType = (0, solc_typed_ast_1.getNodeType)(node, ast.compilerVersion);
        (0, assert_1.default)(nodeType instanceof solc_typed_ast_1.TypeNameType, `Expected TypeNameType, found ${(0, astPrinter_1.printTypeNode)(nodeType)}`);
        nodeType = nodeType.type;
        if (nodeType instanceof solc_typed_ast_1.IntType && (memberName === 'min' || memberName === 'max')) {
            const value = memberName === 'min' ? calculateIntMin(nodeType) : calculateIntMax(nodeType);
            return (0, nodeTemplates_1.createNumberLiteral)(value, ast, nodeType.pp());
        }
        if (nodeType instanceof solc_typed_ast_1.UserDefinedType) {
            const userDef = nodeType.definition;
            if (userDef instanceof solc_typed_ast_1.EnumDefinition && (memberName === 'min' || memberName === 'max'))
                return memberName === 'min'
                    ? createEnumMemberAccess(typestring, node.typeString, userDef, userDef.vMembers[0], ast)
                    : createEnumMemberAccess(typestring, node.typeString, userDef, userDef.vMembers[userDef.vMembers.length - 1], ast);
            if (userDef instanceof solc_typed_ast_1.ContractDefinition) {
                if (memberName === 'name')
                    return (0, nodeTemplates_1.createStringLiteral)(userDef.name, ast);
                if (['runtimeCode', 'executionCode'].includes(memberName))
                    throw new errors_1.WillNotSupportError(`Access to ${memberName} is not supported`);
                if (userDef.kind === solc_typed_ast_1.ContractKind.Interface && memberName === 'interfaceId') {
                    const interfaceId = userDef.interfaceId(abi_1.ABIEncoderVersion.V2);
                    (0, assert_1.default)(interfaceId !== undefined, 'Contracts of kind interface must have a defined interfaceId');
                    const value = BigInt('0x' + interfaceId);
                    return (0, nodeTemplates_1.createNumberLiteral)(value, ast);
                }
            }
        }
        return null;
    }
}
exports.TypeInformationCalculator = TypeInformationCalculator;
//# sourceMappingURL=typeInformationCalculator.js.map