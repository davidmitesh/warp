"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSourceFromLocation = exports.isCalldataDynArrayStruct = exports.isExternalMemoryDynArray = exports.isExternalCall = exports.mangleOwnContractInterface = exports.mangleStructName = exports.functionAffectsState = exports.expressionHasSideEffects = exports.toUintOrFelt = exports.splitDarray = exports.isNameless = exports.toSingleExpression = exports.isExternallyVisible = exports.isCairoConstant = exports.narrowBigIntSafe = exports.narrowBigInt = exports.bigintToTwosComplement = exports.countNestedMapItems = exports.groupBy = exports.mergeImports = exports.typeNameFromTypeNode = exports.mapRange = exports.printCompileErrors = exports.extractProperty = exports.exactInstanceOf = exports.runSanityCheck = exports.unitValue = exports.toHexString = exports.counterGenerator = exports.union = exports.primitiveTypeToCairo = exports.divmod = void 0;
const assert_1 = __importDefault(require("assert"));
const solc_typed_ast_1 = require("solc-typed-ast");
const web3_1 = __importDefault(require("web3"));
const astChecking_1 = require("./astChecking");
const astPrinter_1 = require("./astPrinter");
const errors_1 = require("./errors");
const formatting_1 = require("./formatting");
const nodeTemplates_1 = require("./nodeTemplates");
const nodeTypeProcessing_1 = require("./nodeTypeProcessing");
const uint128 = BigInt('0x100000000000000000000000000000000');
function divmod(x, y) {
    const div = BigInt(x / y);
    const rem = BigInt(x % y);
    return [div, rem];
}
exports.divmod = divmod;
function primitiveTypeToCairo(typeString) {
    switch (typeString) {
        case 'uint':
        case 'uint256':
        case 'int':
        case 'int256':
            return 'Uint256';
        case 'fixed':
        case 'ufixed':
            throw new errors_1.NotSupportedYetError('Fixed types not implemented');
        default:
            return 'felt';
    }
}
exports.primitiveTypeToCairo = primitiveTypeToCairo;
function union(setA, setB) {
    const _union = new Set(setA);
    for (const elem of setB) {
        _union.add(elem);
    }
    return _union;
}
exports.union = union;
function* counterGenerator(start = 0) {
    let count = start;
    while (true) {
        yield count;
        count++;
    }
}
exports.counterGenerator = counterGenerator;
function toHexString(stringValue) {
    return stringValue
        .split('')
        .map((c) => {
        // All expected characters have 2digit ascii hex codes,
        // so no need to set to fixed length
        return c.charCodeAt(0).toString(16);
    })
        .join('');
}
exports.toHexString = toHexString;
function unitValue(unit) {
    if (unit === undefined) {
        return 1;
    }
    switch (unit) {
        case solc_typed_ast_1.EtherUnit.Wei:
            return 1;
        case solc_typed_ast_1.EtherUnit.GWei:
            return 10 ** 9;
        case solc_typed_ast_1.EtherUnit.Szabo:
            return 10 ** 12;
        case solc_typed_ast_1.EtherUnit.Finney:
            return 10 ** 15;
        case solc_typed_ast_1.EtherUnit.Ether:
            return 10 ** 18;
        case solc_typed_ast_1.TimeUnit.Seconds:
            return 1;
        case solc_typed_ast_1.TimeUnit.Minutes:
            return 60;
        case solc_typed_ast_1.TimeUnit.Hours:
            return 60 * 60;
        case solc_typed_ast_1.TimeUnit.Days:
            return 24 * 60 * 60;
        case solc_typed_ast_1.TimeUnit.Weeks:
            return 7 * 24 * 60 * 60;
        case solc_typed_ast_1.TimeUnit.Years: // Removed since solidity 0.5.0, handled for completeness
            return 365 * 24 * 60 * 60;
        default:
            throw new errors_1.TranspileFailedError('Encountered unknown unit');
    }
}
exports.unitValue = unitValue;
function runSanityCheck(ast, printResult, passName) {
    if (printResult)
        console.log(`Running sanity check after ${passName}`);
    if ((0, astChecking_1.isSane)(ast)) {
        if (printResult)
            console.log('AST passed sanity check');
        return true;
    }
    if (printResult)
        console.log('AST failed sanity check');
    return false;
}
exports.runSanityCheck = runSanityCheck;
// Returns whether x is of type T but not any subclass of T
function exactInstanceOf(x, typeName) {
    return x instanceof typeName && !(Object.getPrototypeOf(x) instanceof typeName);
}
exports.exactInstanceOf = exactInstanceOf;
function extractProperty(propName, obj) {
    return extractDeepProperty(propName, obj, 0);
}
exports.extractProperty = extractProperty;
const MaxSearchDepth = 100;
function extractDeepProperty(propName, obj, currentDepth) {
    // No non-adversarially created object should ever reach this, but since prototype loops are technically possible
    if (currentDepth > MaxSearchDepth) {
        return undefined;
    }
    const entry = Object.entries(obj).find(([name]) => name === propName);
    if (entry === undefined) {
        const prototype = Object.getPrototypeOf(obj);
        if (prototype !== null) {
            return extractDeepProperty(propName, Object.getPrototypeOf(obj), currentDepth + 1);
        }
        else {
            return undefined;
        }
    }
    return entry[1];
}
function printCompileErrors(e) {
    (0, errors_1.logError)('---Compile Failed---');
    e.failures.forEach((failure) => {
        (0, errors_1.logError)(`Compiler version ${failure.compilerVersion} reported errors:`);
        failure.errors.forEach((error, index) => {
            (0, errors_1.logError)(`    --${index + 1}--`);
            const errorLines = error.split('\n');
            errorLines.forEach((line) => (0, errors_1.logError)(`    ${line}`));
        });
    });
}
exports.printCompileErrors = printCompileErrors;
function mapRange(n, func) {
    return [...Array(n).keys()].map(func);
}
exports.mapRange = mapRange;
function typeNameFromTypeNode(node, ast) {
    node = (0, solc_typed_ast_1.generalizeType)(node)[0];
    let result = null;
    if (node instanceof solc_typed_ast_1.AddressType) {
        result = (0, nodeTemplates_1.createAddressTypeName)(node.payable, ast);
    }
    else if (node instanceof solc_typed_ast_1.ArrayType) {
        result = new solc_typed_ast_1.ArrayTypeName(ast.reserveId(), '', node.pp(), typeNameFromTypeNode(node.elementT, ast), node.size === undefined ? undefined : (0, nodeTemplates_1.createNumberLiteral)(node.size, ast));
    }
    else if (node instanceof solc_typed_ast_1.BytesType) {
        result = (0, nodeTemplates_1.createBytesTypeName)(ast);
    }
    else if (node instanceof solc_typed_ast_1.BoolType) {
        result = (0, nodeTemplates_1.createBoolTypeName)(ast);
    }
    else if (node instanceof solc_typed_ast_1.FixedBytesType) {
        result = new solc_typed_ast_1.ElementaryTypeName(ast.reserveId(), '', node.pp(), node.pp());
    }
    else if (node instanceof solc_typed_ast_1.IntLiteralType) {
        throw new errors_1.TranspileFailedError(`Attempted to create typename for int literal`);
    }
    else if (node instanceof solc_typed_ast_1.IntType) {
        result = new solc_typed_ast_1.ElementaryTypeName(ast.reserveId(), '', node.pp(), node.pp());
    }
    else if (node instanceof solc_typed_ast_1.PointerType) {
        result = typeNameFromTypeNode(node.to, ast);
    }
    else if (node instanceof solc_typed_ast_1.MappingType) {
        const key = typeNameFromTypeNode(node.keyType, ast);
        const value = typeNameFromTypeNode(node.valueType, ast);
        result = new solc_typed_ast_1.Mapping(ast.reserveId(), '', `mapping(${key.typeString} => ${value.typeString})`, key, value);
    }
    else if (node instanceof solc_typed_ast_1.UserDefinedType) {
        return new solc_typed_ast_1.UserDefinedTypeName(ast.reserveId(), '', node.pp(), node.definition.name, node.definition.id, new solc_typed_ast_1.IdentifierPath(ast.reserveId(), '', node.definition.name, node.definition.id));
    }
    else if (node instanceof solc_typed_ast_1.StringType) {
        return new solc_typed_ast_1.ElementaryTypeName(ast.reserveId(), '', 'string', 'string', 'nonpayable');
    }
    if (result === null) {
        throw new errors_1.NotSupportedYetError(`${(0, astPrinter_1.printTypeNode)(node)} to typename not implemented yet`);
    }
    ast.setContextRecursive(result);
    return result;
}
exports.typeNameFromTypeNode = typeNameFromTypeNode;
function mergeImports(...maps) {
    return maps.reduce((acc, curr) => {
        curr.forEach((importedSymbols, location) => {
            const accSet = acc.get(location) ?? new Set();
            importedSymbols.forEach((s) => accSet.add(s));
            acc.set(location, accSet);
        });
        return acc;
    }, new Map());
}
exports.mergeImports = mergeImports;
function groupBy(arr, groupFunc) {
    const grouped = new Map();
    arr.forEach((v) => {
        const key = groupFunc(v);
        const s = grouped.get(key) ?? new Set([]);
        grouped.set(key, new Set([...s, v]));
    });
    return grouped;
}
exports.groupBy = groupBy;
function countNestedMapItems(map) {
    return [...map.values()].reduce((acc, curr) => acc + curr.size, 0);
}
exports.countNestedMapItems = countNestedMapItems;
function bigintToTwosComplement(val, width) {
    if (val >= 0n) {
        // Non-negative values just need to be truncated to the given bitWidth
        const bits = val.toString(2);
        return BigInt(`0b${bits.slice(-width)}`);
    }
    else {
        // Negative values need to be converted to two's complement
        // This is done by flipping the bits, adding one, and truncating
        const absBits = (-val).toString(2);
        const allBits = `${'0'.repeat(Math.max(width - absBits.length, 0))}${absBits}`;
        const inverted = `0b${[...allBits].map((c) => (c === '0' ? '1' : '0')).join('')}`;
        const twosComplement = (BigInt(inverted) + 1n).toString(2).slice(-width);
        return BigInt(`0b${twosComplement}`);
    }
}
exports.bigintToTwosComplement = bigintToTwosComplement;
function narrowBigInt(n) {
    const narrowed = parseInt(n.toString());
    if (BigInt(narrowed) !== n)
        return null;
    return narrowed;
}
exports.narrowBigInt = narrowBigInt;
function narrowBigIntSafe(n, errorMessage) {
    const narrowed = narrowBigInt(n);
    if (narrowed === null) {
        throw new errors_1.WillNotSupportError(errorMessage ?? `Unable to accurately parse ${n.toString()}`);
    }
    return narrowed;
}
exports.narrowBigIntSafe = narrowBigIntSafe;
function isCairoConstant(node) {
    if (node.mutability === solc_typed_ast_1.Mutability.Constant && node.vValue instanceof solc_typed_ast_1.Literal) {
        if (node.vType instanceof solc_typed_ast_1.ElementaryTypeName) {
            return primitiveTypeToCairo(node.vType.name) === 'felt';
        }
    }
    return false;
}
exports.isCairoConstant = isCairoConstant;
function isExternallyVisible(node) {
    return (node.visibility === solc_typed_ast_1.FunctionVisibility.External || node.visibility === solc_typed_ast_1.FunctionVisibility.Public);
}
exports.isExternallyVisible = isExternallyVisible;
function toSingleExpression(expressions, ast) {
    if (expressions.length === 1)
        return expressions[0];
    return new solc_typed_ast_1.TupleExpression(ast.reserveId(), '', `tuple(${expressions.map((e) => e.typeString).join(',')})`, false, expressions);
}
exports.toSingleExpression = toSingleExpression;
function isNameless(node) {
    return [solc_typed_ast_1.FunctionKind.Constructor, solc_typed_ast_1.FunctionKind.Fallback, solc_typed_ast_1.FunctionKind.Receive].includes(node.kind);
}
exports.isNameless = isNameless;
function splitDarray(scope, dArrayVarDecl, ast) {
    (0, assert_1.default)(dArrayVarDecl.vType !== undefined);
    const arrayLen = new solc_typed_ast_1.VariableDeclaration(ast.reserveId(), '', true, false, dArrayVarDecl.name + '_len', scope, false, solc_typed_ast_1.DataLocation.CallData, solc_typed_ast_1.StateVariableVisibility.Internal, solc_typed_ast_1.Mutability.Immutable, 'uint248', undefined, new solc_typed_ast_1.ElementaryTypeName(ast.reserveId(), '', 'uint248', 'uint248'), undefined);
    return [arrayLen, dArrayVarDecl];
}
exports.splitDarray = splitDarray;
function toUintOrFelt(value, nBits) {
    const val = bigintToTwosComplement(BigInt(value.toString()), nBits);
    if (nBits > 251) {
        const [high, low] = divmod(val, uint128);
        return [low, high];
    }
    else {
        return [val];
    }
}
exports.toUintOrFelt = toUintOrFelt;
function expressionHasSideEffects(node) {
    return ((node instanceof solc_typed_ast_1.FunctionCall && functionAffectsState(node)) ||
        node instanceof solc_typed_ast_1.Assignment ||
        node.children.some((child) => child instanceof solc_typed_ast_1.Expression && expressionHasSideEffects(child)));
}
exports.expressionHasSideEffects = expressionHasSideEffects;
function functionAffectsState(node) {
    const funcDef = node.vReferencedDeclaration;
    if (funcDef instanceof solc_typed_ast_1.FunctionDefinition) {
        return (funcDef.stateMutability !== solc_typed_ast_1.FunctionStateMutability.Pure &&
            funcDef.stateMutability !== solc_typed_ast_1.FunctionStateMutability.View);
    }
    return true;
}
exports.functionAffectsState = functionAffectsState;
function mangleStructName(structDef) {
    return `${structDef.name}_${web3_1.default.utils.sha3(structDef.canonicalName)?.slice(2, 10)}`;
}
exports.mangleStructName = mangleStructName;
function mangleOwnContractInterface(contractOrName) {
    const name = typeof contractOrName === 'string' ? contractOrName : contractOrName.name;
    return `${name}_interface`;
}
exports.mangleOwnContractInterface = mangleOwnContractInterface;
function isExternalCall(node) {
    return (node.vReferencedDeclaration instanceof solc_typed_ast_1.FunctionDefinition &&
        isExternallyVisible(node.vReferencedDeclaration));
}
exports.isExternalCall = isExternalCall;
// Detects when an identifier represents a memory dynamic arrays that's being treated as calldata
// (which only occurs when the memory dynamic array is the output of a cross contract call function)
function isExternalMemoryDynArray(node, compilerVersion) {
    const declaration = node.vReferencedDeclaration;
    if (!(declaration instanceof solc_typed_ast_1.VariableDeclaration) ||
        node.parent instanceof solc_typed_ast_1.IndexAccess ||
        node.parent instanceof solc_typed_ast_1.MemberAccess)
        return false;
    const declarationLocation = declaration.storageLocation;
    const [nodeType, typeLocation] = (0, solc_typed_ast_1.generalizeType)((0, solc_typed_ast_1.getNodeType)(node, compilerVersion));
    return ((0, nodeTypeProcessing_1.isDynamicArray)(nodeType) &&
        declarationLocation === solc_typed_ast_1.DataLocation.CallData &&
        typeLocation === solc_typed_ast_1.DataLocation.Memory);
}
exports.isExternalMemoryDynArray = isExternalMemoryDynArray;
// Detects when an identifier represents a calldata dynamic array in solidity
function isCalldataDynArrayStruct(node, compilerVersion) {
    return ((0, nodeTypeProcessing_1.isDynamicCallDataArray)((0, solc_typed_ast_1.getNodeType)(node, compilerVersion)) &&
        ((node.getClosestParentByType(solc_typed_ast_1.Return) !== undefined &&
            node.getClosestParentByType(solc_typed_ast_1.IndexAccess) === undefined &&
            node.getClosestParentByType(solc_typed_ast_1.FunctionDefinition)?.visibility === solc_typed_ast_1.FunctionVisibility.External &&
            node.getClosestParentByType(solc_typed_ast_1.IndexAccess) === undefined &&
            node.getClosestParentByType(solc_typed_ast_1.MemberAccess) === undefined) ||
            (node.parent instanceof solc_typed_ast_1.FunctionCall &&
                // 'string_hash' function can not be user defined, due to mangling identifiers
                (isExternalCall(node.parent) || node.parent.vFunctionName === 'string_hash'))));
}
exports.isCalldataDynArrayStruct = isCalldataDynArrayStruct;
function getSourceFromLocation(source, location) {
    const linesAroundSource = 2;
    const sourceBeforeLocation = source.substring(0, location.offset).split('\n');
    const sourceAfterLocation = source.substring(location.offset).split('\n');
    const startLineNum = sourceBeforeLocation.length - linesAroundSource;
    const [previousLines, currentLineNum] = sourceBeforeLocation
        .slice(sourceBeforeLocation.length - (linesAroundSource + 1), sourceBeforeLocation.length - 1)
        .reduce(([s, n], c) => [[...s, `${n}  ${c}`], n + 1], [new Array(), startLineNum < 0 ? 0 : startLineNum]);
    const [currentLine, followingLineNum] = [
        sourceBeforeLocation.slice(-1),
        (0, formatting_1.error)(source.substring(location.offset, location.offset + location.length)),
        sourceAfterLocation[0].substring(location.length),
    ]
        .join('')
        .split('\n')
        .reduce(([s, n], c) => [[...s, `${n}  ${c}`], n + 1], [new Array(), currentLineNum]);
    const [followingLines] = sourceAfterLocation
        .slice(currentLine.length, currentLine.length + linesAroundSource)
        .reduce(([s, n], c) => [[...s, `${n}  ${c}`], n + 1], [new Array(), followingLineNum]);
    return [...previousLines, ...currentLine, ...followingLines].join('\n');
}
exports.getSourceFromLocation = getSourceFromLocation;
//# sourceMappingURL=utils.js.map