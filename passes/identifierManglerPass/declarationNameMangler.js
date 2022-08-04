"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeclarationNameMangler = exports.checkSourceTerms = exports.reservedTerms = void 0;
const solc_typed_ast_1 = require("solc-typed-ast");
const abi_1 = require("solc-typed-ast/dist/types/abi");
const mapper_1 = require("../../ast/mapper");
const astPrinter_1 = require("../../utils/astPrinter");
const errors_1 = require("../../utils/errors");
const nameModifiers_1 = require("../../utils/nameModifiers");
const utils_1 = require("../../utils/utils");
// Terms grabbed from here
// https://github.com/starkware-libs/cairo-lang/blob/master/src/starkware/cairo/lang/compiler/cairo.ebnf
exports.reservedTerms = [
    'ret',
    'return',
    'using',
    'jmp',
    'alloc_locals',
    'rel',
    'func',
    'end',
    'nondet',
    'felt',
    'codeoffset',
    'Uint256',
    'cast',
    'ap',
    'fp',
    'dw',
    '%lang',
    '%builtins',
    'with_attr',
    'static_assert',
    'assert',
    'member',
    'new',
    'call',
    'abs',
    'as',
    'from',
    'local',
    'let',
    'tempvar',
    'const',
    'struct',
    'namespace',
];
const unsupportedCharacters = ['$'];
function checkSourceTerms(term, node) {
    if (exports.reservedTerms.includes(term)) {
        throw new errors_1.WillNotSupportError(`${(0, astPrinter_1.printNode)(node)} contains ${term} which is a cairo keyword`);
    }
    unsupportedCharacters.forEach((c) => {
        if (term.includes(c)) {
            throw new errors_1.WillNotSupportError(`${(0, astPrinter_1.printNode)(node)} ${term} contains unsupported character ${c}`);
        }
    });
}
exports.checkSourceTerms = checkSourceTerms;
class DeclarationNameMangler extends mapper_1.ASTMapper {
    constructor() {
        super(...arguments);
        this.lastUsedVariableId = 0;
        this.lastUsedFunctionId = 0;
        this.lastUsedTypeId = 0;
    }
    // This strategy should allow checked demangling post transpilation for a more readable result
    createNewExternalFunctionName(fd) {
        return !(0, utils_1.isNameless)(fd)
            ? `${fd.name}_${fd.canonicalSignatureHash(abi_1.ABIEncoderVersion.V2)}`
            : fd.name;
    }
    // This strategy should allow checked demangling post transpilation for a more readable result
    createNewInternalFunctionName(existingName) {
        return `${nameModifiers_1.MANGLED_INTERNAL_USER_FUNCTION}${this.lastUsedFunctionId++}_${existingName}`;
    }
    createNewTypeName(existingName) {
        return `${nameModifiers_1.MANGLED_TYPE_NAME}${this.lastUsedTypeId++}_${existingName}`;
    }
    createNewVariableName(existingName) {
        return `${nameModifiers_1.MANGLED_LOCAL_VAR}${this.lastUsedVariableId++}_${existingName}`;
    }
    visitStructDefinition(_node, _ast) {
        // struct definitions should already have been mangled at this point
        // by visitContractDefinition and visitSourceUnit
        return;
    }
    visitVariableDeclaration(node, ast) {
        if (!node.stateVariable) {
            this.mangleVariableDeclaration(node);
        }
        this.commonVisit(node, ast);
    }
    mangleVariableDeclaration(node) {
        node.name = this.createNewVariableName(node.name);
    }
    mangleStructDefinition(node) {
        checkSourceTerms(node.name, node);
        node.vMembers.forEach((m) => this.mangleVariableDeclaration(m));
    }
    mangleFunctionDefinition(node) {
        if (node.isConstructor)
            return;
        switch (node.visibility) {
            case solc_typed_ast_1.FunctionVisibility.External:
            case solc_typed_ast_1.FunctionVisibility.Public:
                node.name = this.createNewExternalFunctionName(node);
                break;
            default:
                node.name = this.createNewInternalFunctionName(node.name);
        }
    }
    mangleContractDefinition(node) {
        checkSourceTerms(node.name, node);
        node.vStructs.forEach((s) => this.mangleStructDefinition(s));
        node.vFunctions.forEach((n) => this.mangleFunctionDefinition(n));
        node.vStateVariables.forEach((v) => this.mangleVariableDeclaration(v));
    }
    visitSourceUnit(node, ast) {
        node.vStructs.forEach((s) => this.mangleStructDefinition(s));
        node.vFunctions.forEach((n) => this.mangleFunctionDefinition(n));
        node.vContracts.forEach((n) => this.mangleContractDefinition(n));
        this.commonVisit(node, ast);
    }
}
exports.DeclarationNameMangler = DeclarationNameMangler;
//# sourceMappingURL=declarationNameMangler.js.map