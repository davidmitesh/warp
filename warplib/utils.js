"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getIntOrFixedByteBitWidth = exports.BoolxBoolFunction = exports.IntFunction = exports.Comparison = exports.IntxIntFunction = exports.generateFile = exports.msbAndNext = exports.msb = exports.mask = exports.bound = exports.uint256 = exports.pow2 = exports.forAllWidths = void 0;
const assert_1 = __importDefault(require("assert"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const fs = __importStar(require("fs"));
const solc_typed_ast_1 = require("solc-typed-ast");
const astPrinter_1 = require("../utils/astPrinter");
const functionGeneration_1 = require("../utils/functionGeneration");
const utils_1 = require("../utils/utils");
function forAllWidths(funcGen) {
    return (0, utils_1.mapRange)(32, (n) => 8 * (n + 1)).flatMap(funcGen);
}
exports.forAllWidths = forAllWidths;
function pow2(n) {
    return 2n ** BigInt(n);
}
exports.pow2 = pow2;
function uint256(n) {
    if (typeof n === 'number') {
        n = BigInt(n);
    }
    const low = n % 2n ** 128n;
    const high = (n - low) / 2n ** 128n;
    return `Uint256(0x${low.toString(16)}, 0x${high.toString(16)})`;
}
exports.uint256 = uint256;
function bound(width) {
    return `0x${pow2(width).toString(16)}`;
}
exports.bound = bound;
function mask(width) {
    return `0x${(pow2(width) - 1n).toString(16)}`;
}
exports.mask = mask;
function msb(width) {
    return `0x${pow2(width - 1).toString(16)}`;
}
exports.msb = msb;
function msbAndNext(width) {
    return `0x${(pow2(width) + pow2(width - 1)).toString(16)}`;
}
exports.msbAndNext = msbAndNext;
const warpVenvPrefix = `PATH=${path.resolve(__dirname, '..', '..', 'warp_venv', 'bin')}:$PATH`;
function generateFile(name, imports, functions) {
    fs.writeFileSync(`./warplib/maths/${name}.cairo`, `#AUTO-GENERATED\n${imports.join('\n')}\n\n${functions.join('\n')}\n`);
    (0, child_process_1.execSync)(`${warpVenvPrefix} cairo-format -i ./warplib/maths/${name}.cairo`);
}
exports.generateFile = generateFile;
function IntxIntFunction(node, name, appendWidth, separateSigned, unsafe, implicits, ast) {
    const lhsType = (0, utils_1.typeNameFromTypeNode)((0, solc_typed_ast_1.getNodeType)(node.vLeftExpression, ast.compilerVersion), ast);
    const rhsType = (0, utils_1.typeNameFromTypeNode)((0, solc_typed_ast_1.getNodeType)(node.vRightExpression, ast.compilerVersion), ast);
    const retType = (0, solc_typed_ast_1.getNodeType)(node, ast.compilerVersion);
    (0, assert_1.default)(retType instanceof solc_typed_ast_1.IntType || retType instanceof solc_typed_ast_1.FixedBytesType, `${(0, astPrinter_1.printNode)(node)} has type ${(0, astPrinter_1.printTypeNode)(retType)}, which is not compatible with ${name}`);
    const width = getIntOrFixedByteBitWidth(retType);
    const signed = retType instanceof solc_typed_ast_1.IntType && retType.signed;
    const shouldAppendWidth = appendWidth === 'always' || (appendWidth === 'signedOrWide' && signed) || width === 256;
    const fullName = [
        'warp_',
        name,
        signed && separateSigned ? '_signed' : '',
        unsafe ? '_unsafe' : '',
        shouldAppendWidth ? `${width}` : '',
    ].join('');
    const importName = [
        'warplib.maths.',
        name,
        signed && separateSigned ? '_signed' : '',
        unsafe ? '_unsafe' : '',
    ].join('');
    const stub = (0, functionGeneration_1.createCairoFunctionStub)(fullName, [
        ['lhs', lhsType],
        ['rhs', rhsType],
    ], [['res', (0, utils_1.typeNameFromTypeNode)(retType, ast)]], implicits(width, signed), ast, node);
    const call = new solc_typed_ast_1.FunctionCall(ast.reserveId(), node.src, node.typeString, solc_typed_ast_1.FunctionCallKind.FunctionCall, new solc_typed_ast_1.Identifier(ast.reserveId(), '', `function (${node.typeString}, ${node.typeString}) returns (${node.typeString})`, fullName, stub.id), [node.vLeftExpression, node.vRightExpression]);
    ast.replaceNode(node, call);
    ast.registerImport(call, importName, fullName);
}
exports.IntxIntFunction = IntxIntFunction;
function Comparison(node, name, appendWidth, separateSigned, implicits, ast) {
    const lhsType = (0, solc_typed_ast_1.getNodeType)(node.vLeftExpression, ast.compilerVersion);
    const rhsType = (0, solc_typed_ast_1.getNodeType)(node.vLeftExpression, ast.compilerVersion);
    const retType = (0, solc_typed_ast_1.getNodeType)(node, ast.compilerVersion);
    const wide = (lhsType instanceof solc_typed_ast_1.IntType || lhsType instanceof solc_typed_ast_1.FixedBytesType) &&
        getIntOrFixedByteBitWidth(lhsType) === 256;
    const signed = lhsType instanceof solc_typed_ast_1.IntType && lhsType.signed;
    const shouldAppendWidth = wide || (appendWidth === 'signedOrWide' && signed);
    const fullName = [
        'warp_',
        name,
        separateSigned && signed ? '_signed' : '',
        shouldAppendWidth ? `${getIntOrFixedByteBitWidth(lhsType)}` : '',
    ].join('');
    const importName = `warplib.maths.${name}${signed && separateSigned ? '_signed' : ''}`;
    const stub = (0, functionGeneration_1.createCairoFunctionStub)(fullName, [
        ['lhs', (0, utils_1.typeNameFromTypeNode)(lhsType, ast)],
        ['rhs', (0, utils_1.typeNameFromTypeNode)(rhsType, ast)],
    ], [['res', (0, utils_1.typeNameFromTypeNode)(retType, ast)]], implicits(wide, signed), ast, node);
    const call = new solc_typed_ast_1.FunctionCall(ast.reserveId(), node.src, node.typeString, solc_typed_ast_1.FunctionCallKind.FunctionCall, new solc_typed_ast_1.Identifier(ast.reserveId(), '', `function (${node.vLeftExpression.typeString}, ${node.vRightExpression.typeString}) returns (${node.typeString})`, fullName, stub.id), [node.vLeftExpression, node.vRightExpression]);
    ast.replaceNode(node, call);
    ast.registerImport(call, importName, fullName);
}
exports.Comparison = Comparison;
function IntFunction(node, argument, name, fileName, implicits, ast) {
    const opType = (0, solc_typed_ast_1.getNodeType)(argument, ast.compilerVersion);
    const retType = (0, solc_typed_ast_1.getNodeType)(node, ast.compilerVersion);
    (0, assert_1.default)(retType instanceof solc_typed_ast_1.IntType || retType instanceof solc_typed_ast_1.FixedBytesType, `Expected IntType or FixedBytes for ${name}, got ${(0, astPrinter_1.printTypeNode)(retType)}`);
    const width = getIntOrFixedByteBitWidth(retType);
    const fullName = `warp_${name}${width}`;
    const stub = (0, functionGeneration_1.createCairoFunctionStub)(fullName, [['op', (0, utils_1.typeNameFromTypeNode)(opType, ast)]], [['res', (0, utils_1.typeNameFromTypeNode)(retType, ast)]], implicits(width === 256), ast, node);
    const call = new solc_typed_ast_1.FunctionCall(ast.reserveId(), node.src, node.typeString, solc_typed_ast_1.FunctionCallKind.FunctionCall, new solc_typed_ast_1.Identifier(ast.reserveId(), '', `function (${argument.typeString}) returns (${node.typeString})`, fullName, stub.id), [argument]);
    ast.replaceNode(node, call);
    ast.registerImport(call, `warplib.maths.${fileName}`, fullName);
}
exports.IntFunction = IntFunction;
function BoolxBoolFunction(node, name, ast) {
    const lhsType = (0, solc_typed_ast_1.getNodeType)(node.vLeftExpression, ast.compilerVersion);
    const rhsType = (0, solc_typed_ast_1.getNodeType)(node.vRightExpression, ast.compilerVersion);
    const retType = (0, solc_typed_ast_1.getNodeType)(node, ast.compilerVersion);
    (0, assert_1.default)(lhsType instanceof solc_typed_ast_1.BoolType, `Expected BoolType for ${name} left argument, got ${(0, astPrinter_1.printTypeNode)(lhsType)}`);
    (0, assert_1.default)(rhsType instanceof solc_typed_ast_1.BoolType, `Expected BoolType for ${name} right argument, got ${(0, astPrinter_1.printTypeNode)(rhsType)}`);
    (0, assert_1.default)(retType instanceof solc_typed_ast_1.BoolType, `Expected BoolType for ${name} return type, got ${(0, astPrinter_1.printTypeNode)(retType)}`);
    const fullName = `warp_${name}`;
    const stub = (0, functionGeneration_1.createCairoFunctionStub)(fullName, [
        ['lhs', (0, utils_1.typeNameFromTypeNode)(lhsType, ast)],
        ['rhs', (0, utils_1.typeNameFromTypeNode)(rhsType, ast)],
    ], [['res', (0, utils_1.typeNameFromTypeNode)(retType, ast)]], [], ast, node);
    const call = new solc_typed_ast_1.FunctionCall(ast.reserveId(), node.src, node.typeString, solc_typed_ast_1.FunctionCallKind.FunctionCall, new solc_typed_ast_1.Identifier(ast.reserveId(), '', `function (${node.vLeftExpression.typeString}, ${node.vRightExpression.typeString}) returns (${node.typeString})`, fullName, stub.id), [node.vLeftExpression, node.vRightExpression]);
    ast.replaceNode(node, call);
    ast.registerImport(call, `warplib.maths.${name}`, fullName);
}
exports.BoolxBoolFunction = BoolxBoolFunction;
function getIntOrFixedByteBitWidth(type) {
    if (type instanceof solc_typed_ast_1.IntType) {
        return type.nBits;
    }
    else if (type instanceof solc_typed_ast_1.FixedBytesType) {
        return type.size * 8;
    }
    else {
        (0, assert_1.default)(false, `Attempted to get width for non-int, non-fixed bytes type ${(0, astPrinter_1.printTypeNode)(type)}`);
    }
}
exports.getIntOrFixedByteBitWidth = getIntOrFixedByteBitWidth;
//# sourceMappingURL=utils.js.map