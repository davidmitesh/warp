"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.selectSignature = exports.encodeInputs = exports.transcodeCalldata = exports.dumpABI = exports.ABIExtractor = void 0;
const assert_1 = __importDefault(require("assert"));
const fs_1 = require("fs");
const prompts_1 = __importDefault(require("prompts"));
const solc_typed_ast_1 = require("solc-typed-ast");
const web3_1 = __importDefault(require("web3"));
const mapper_1 = require("../ast/mapper");
const astPrinter_1 = require("../utils/astPrinter");
const cloning_1 = require("../utils/cloning");
const errors_1 = require("../utils/errors");
const functionSignatureParser_1 = require("../utils/functionSignatureParser");
const getTypeString_1 = require("../utils/getTypeString");
const nodeTemplates_1 = require("../utils/nodeTemplates");
const utils_1 = require("../utils/utils");
class ABIExtractor extends mapper_1.ASTMapper {
    // Function to add passes that should have been run before this pass
    addInitialPassPrerequisites() {
        const passKeys = new Set([]);
        passKeys.forEach((key) => this.addPassPrerequisite(key));
    }
    visitSourceUnit(node, ast) {
        this.commonVisit(node, ast);
        node.vFunctions.forEach((fd) => 
        // @ts-ignore Importing the ABIEncoderVersion enum causes a depenency import error
        addSignature(node, ast, fd.canonicalSignature('ABIEncoderV2')));
        node.vContracts
            .flatMap((cd) => cd.vLinearizedBaseContracts)
            .forEach((cd) => {
            if (!cd.abstract) {
                // We do this to trick the canonicalSignature method into giving us a result
                const fakeConstructor = cd.vConstructor !== undefined
                    ? (0, cloning_1.cloneASTNode)(cd.vConstructor, ast)
                    : (0, nodeTemplates_1.createDefaultConstructor)(cd, ast);
                fakeConstructor.isConstructor = false;
                fakeConstructor.name = 'constructor';
                // @ts-ignore Importing the ABIEncoderVersion enum causes a depenency import error
                addSignature(node, ast, fakeConstructor.canonicalSignature('ABIEncoderV2'));
            }
            cd.vFunctions.forEach((fd) => {
                if ((0, utils_1.isExternallyVisible)(fd)) {
                    // @ts-ignore Importing the ABIEncoderVersion enum causes a depenency import error
                    addSignature(node, ast, fd.canonicalSignature('ABIEncoderV2'));
                }
            });
        });
    }
    // The CanonicalSignature fails for ArrayTypeNames with non-literal, non-undefined length
    // This replaces such cases with literals
    visitArrayTypeName(node, ast) {
        this.commonVisit(node, ast);
        if (node.vLength !== undefined && !(node.vLength instanceof solc_typed_ast_1.Literal)) {
            const type = (0, solc_typed_ast_1.generalizeType)((0, solc_typed_ast_1.getNodeType)(node, ast.compilerVersion))[0];
            (0, assert_1.default)(type instanceof solc_typed_ast_1.ArrayType, `${(0, astPrinter_1.printNode)(node)} ${node.typeString} has non-array type ${(0, astPrinter_1.printTypeNode)(type, true)}`);
            (0, assert_1.default)(type.size !== undefined, `Static array ${(0, astPrinter_1.printNode)(node)} ${node.typeString}`);
            const literal = (0, nodeTemplates_1.createNumberLiteral)(type.size, ast, (0, getTypeString_1.generateLiteralTypeString)(type.size.toString()));
            node.vLength = literal;
            ast.registerChild(node.vLength, node);
        }
    }
}
exports.ABIExtractor = ABIExtractor;
function addSignature(node, ast, signature) {
    const abi = ast.abi.get(node.id);
    if (abi === undefined) {
        ast.abi.set(node.id, new Set([signature]));
    }
    else {
        abi.add(signature);
    }
}
function dumpABI(node, ast) {
    return JSON.stringify([...(ast.abi.get(node.id) || new Set()).keys()]);
}
exports.dumpABI = dumpABI;
function transcodeCalldata(funcSignature, inputs) {
    return (0, functionSignatureParser_1.parse)(funcSignature)(inputs);
}
exports.transcodeCalldata = transcodeCalldata;
async function encodeInputs(filePath, func, useCairoABI, rawInputs) {
    if (useCairoABI) {
        const inputs = rawInputs ? `--inputs ${rawInputs.split(',').join(' ')}` : '';
        return [func, inputs];
    }
    const solABI = parseSolAbi(filePath);
    const funcSignature = await selectSignature(solABI, func);
    const selector = new web3_1.default().utils.keccak256(funcSignature).substring(2, 10);
    const funcName = `${func}_${selector}`;
    const inputs = rawInputs
        ? `--inputs ${transcodeCalldata(funcSignature, parseInputs(rawInputs))
            .map((i) => i.toString())
            .join(' ')}`
        : '';
    return [funcName, inputs];
}
exports.encodeInputs = encodeInputs;
function parseInputs(input) {
    try {
        const parsedInput = JSON.parse(`[${input}]`.replaceAll(/\b0x[0-9a-fA-F]+/g, (s) => `"${s}"`));
        validateInput(parsedInput);
        return parsedInput;
    }
    catch (e) {
        throw new errors_1.CLIError('Input must be a comma seperated list of numbers, strings and lists');
    }
}
function validateInput(input) {
    if (input instanceof Array) {
        input.map(validateInput);
        return;
    }
    if (input instanceof String)
        return;
    if (input instanceof Number)
        return;
    if (typeof input === 'string')
        return;
    if (typeof input === 'number')
        return;
    throw new errors_1.CLIError('Input invalid');
}
function parseSolAbi(filePath) {
    const re = /# Original soldity abi: (?<abi>[\w()\][, "]*)/;
    const abiString = (0, fs_1.readFileSync)(filePath, 'utf-8');
    const matches = abiString.match(re);
    if (matches === null || matches.groups === undefined) {
        throw new errors_1.CLIError("Couldn't find solidity abi in file, please include one in the form '# SolABI: [func1(type1,type2),...]");
    }
    const solAbi = JSON.parse(matches.groups.abi);
    validateSolAbi(solAbi);
    return solAbi;
}
function validateSolAbi(solABI) {
    if (solABI instanceof Array) {
        if (!solABI.every((v) => v instanceof String || typeof v === 'string'))
            throw new errors_1.CLIError('Solidity abi in file is not a list of function signatures');
    }
    else {
        throw new errors_1.CLIError('Solidity abi in file is not a list of function signatures.');
    }
}
async function selectSignature(abi, funcName) {
    const matches = abi.filter((fs) => fs.startsWith(funcName));
    if (!matches.length) {
        throw new errors_1.CLIError(`No function in abi with name ${funcName}`);
    }
    if (matches.length === 1)
        return matches[0];
    const choice = await (0, prompts_1.default)({
        type: 'select',
        name: 'func',
        message: `Multiple function definitions found for ${funcName}. Please select one now:`,
        choices: matches.map((func) => ({ title: func, value: func })),
    });
    return choice.func;
}
exports.selectSignature = selectSignature;
//# sourceMappingURL=abiExtractor.js.map