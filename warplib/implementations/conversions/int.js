"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.functionaliseIntConversion = exports.int_conversions = void 0;
const assert_1 = __importDefault(require("assert"));
const solc_typed_ast_1 = require("solc-typed-ast");
const astPrinter_1 = require("../../../utils/astPrinter");
const utils_1 = require("../../utils");
function int_conversions() {
    (0, utils_1.generateFile)('int_conversions', [
        'from starkware.cairo.common.bitwise import bitwise_and',
        'from starkware.cairo.common.cairo_builtins import BitwiseBuiltin',
        'from starkware.cairo.common.math import split_felt',
        'from starkware.cairo.common.uint256 import Uint256, uint256_add',
    ], [
        ...(0, utils_1.forAllWidths)((from) => {
            return (0, utils_1.forAllWidths)((to) => {
                if (from < to) {
                    if (to === 256) {
                        return [
                            `func warp_int${from}_to_int256{range_check_ptr, bitwise_ptr: BitwiseBuiltin*}(op : felt) -> (res : Uint256):`,
                            `    let (msb) = bitwise_and(op, ${(0, utils_1.msb)(from)})`,
                            `    let (high, low) = split_felt(op)`,
                            `    let naiveExtension = Uint256(low, high)`,
                            `    if msb == 0:`,
                            `        return (naiveExtension)`,
                            `    else:`,
                            `        let (res, _) = uint256_add(naiveExtension, ${(0, utils_1.uint256)(sign_extend_value(from, to))})`,
                            `        return (res)`,
                            `    end`,
                            'end',
                        ];
                    }
                    else {
                        return [
                            `func warp_int${from}_to_int${to}{bitwise_ptr: BitwiseBuiltin*}(op : felt) -> (res : felt):`,
                            `    let (msb) = bitwise_and(op, ${(0, utils_1.msb)(from)})`,
                            `    if msb == 0:`,
                            `        return (op)`,
                            `    else:`,
                            `        return (op + 0x${sign_extend_value(from, to).toString(16)})`,
                            `    end`,
                            'end',
                        ];
                    }
                }
                else if (from === to) {
                    return [];
                }
                else {
                    if (from === 256) {
                        if (to > 128) {
                            return [
                                `func warp_int${from}_to_int${to}{bitwise_ptr: BitwiseBuiltin*}(op : Uint256) -> (res : felt):`,
                                `    let (high) = bitwise_and(op.high,${(0, utils_1.mask)(to - 128)})`,
                                `    return (op.low + ${(0, utils_1.bound)(128)} * high)`,
                                `end`,
                            ];
                        }
                        else {
                            return [
                                `func warp_int${from}_to_int${to}{bitwise_ptr: BitwiseBuiltin*}(op : Uint256) -> (res : felt):`,
                                `    let (res) = bitwise_and(op.low, ${(0, utils_1.mask)(to)})`,
                                `    return (res)`,
                                `end`,
                            ];
                        }
                    }
                    else {
                        return [
                            `func warp_int${from}_to_int${to}{bitwise_ptr : BitwiseBuiltin*}(op : felt) -> (res : felt):`,
                            `    let (res) = bitwise_and(op, ${(0, utils_1.mask)(to)})`,
                            `    return (res)`,
                            `end`,
                        ];
                    }
                }
            });
        }),
        '',
        'func warp_uint256{range_check_ptr}(op : felt) -> (res : Uint256):',
        '    let split = split_felt(op)',
        '    return (Uint256(low=split.low, high=split.high))',
        'end',
    ]);
}
exports.int_conversions = int_conversions;
function sign_extend_value(from, to) {
    return 2n ** BigInt(to) - 2n ** BigInt(from);
}
function functionaliseIntConversion(conversion, ast) {
    const arg = conversion.vArguments[0];
    const fromType = (0, solc_typed_ast_1.generalizeType)((0, solc_typed_ast_1.getNodeType)(arg, ast.compilerVersion))[0];
    (0, assert_1.default)(fromType instanceof solc_typed_ast_1.IntType, `Argument of int conversion expected to be int type. Got ${(0, astPrinter_1.printTypeNode)(fromType)} at ${(0, astPrinter_1.printNode)(conversion)}`);
    const toType = (0, solc_typed_ast_1.getNodeType)(conversion, ast.compilerVersion);
    (0, assert_1.default)(toType instanceof solc_typed_ast_1.IntType, `Int conversion expected to be int type. Got ${(0, astPrinter_1.printTypeNode)(toType)} at ${(0, astPrinter_1.printNode)(conversion)}`);
    if (fromType.nBits < 256 && toType.nBits === 256 && !fromType.signed && !toType.signed) {
        (0, utils_1.IntFunction)(conversion, conversion.vArguments[0], 'uint', 'int_conversions', () => ['range_check_ptr'], ast);
        return;
    }
    else if (fromType.nBits === toType.nBits ||
        (fromType.nBits < toType.nBits && !fromType.signed && !toType.signed)) {
        ast.replaceNode(conversion, arg);
        return;
    }
    else {
        const name = `${fromType.pp().startsWith('u') ? fromType.pp().slice(1) : fromType.pp()}_to_int`;
        const implicitsFn = (wide) => {
            if (wide)
                return ['range_check_ptr', 'bitwise_ptr'];
            return ['bitwise_ptr'];
        };
        (0, utils_1.IntFunction)(conversion, conversion.vArguments[0], name, 'int_conversions', implicitsFn, ast);
        return;
    }
}
exports.functionaliseIntConversion = functionaliseIntConversion;
//# sourceMappingURL=int.js.map