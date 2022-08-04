"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EncodeAsFelt = void 0;
const assert_1 = __importDefault(require("assert"));
const solc_typed_ast_1 = require("solc-typed-ast");
const astPrinter_1 = require("../../utils/astPrinter");
const cairoTypeSystem_1 = require("../../utils/cairoTypeSystem");
const errors_1 = require("../../utils/errors");
const functionGeneration_1 = require("../../utils/functionGeneration");
const nodeTemplates_1 = require("../../utils/nodeTemplates");
const nodeTypeProcessing_1 = require("../../utils/nodeTypeProcessing");
const utils_1 = require("../../utils/utils");
const base_1 = require("../base");
const IMPLICITS = '';
/**
 * This class generate `encode` cairo util functions with the objective of making
 * a list of values into a single list where all items are felts. For example:
 * Value list: [a : felt, b : Uint256, c : (felt, felt, felt), d_len : felt, d : felt*]
 * Result: [a, b.low, b.high, c[0], c[1], c[2], d_len, d[0], ..., d[n]]
 *
 * It generates a different function depending on the amount of expressions
 * and their types. It also generate different auxiliar functions depending
 * on the type to encode.
 *
 * Auxiliar functions can and will be reused if possible between different
 * generated encoding functions. I.e. the auxiliar function to encode felt
 * dynamic arrays will be always the same
 */
class EncodeAsFelt extends base_1.StringIndexedFuncGen {
    constructor(externalArrayGen, ast, sourceUnit) {
        super(ast, sourceUnit);
        this.externalArrayGen = externalArrayGen;
        this.auxiliarGeneratedFunctions = new Map();
    }
    getGeneratedCode() {
        return [...this.auxiliarGeneratedFunctions.values(), ...this.generatedFunctions.values()]
            .map((func) => func.code)
            .join('\n\n');
    }
    /**
     * Given a expression list it generates a `encode` cairo function definition
     * and call that serializes the arguments into a list of felts
     * @param expressions expression list
     * @param sourceUnit source unit where the expression is defined
     * @returns a function call that serializes the value of `expressions`
     */
    gen(expressions, sourceUnit) {
        const exprTypes = expressions.map((expr) => (0, solc_typed_ast_1.generalizeType)((0, solc_typed_ast_1.getNodeType)(expr, this.ast.compilerVersion))[0]);
        const functionName = this.getOrCreate(exprTypes);
        const functionStub = (0, functionGeneration_1.createCairoFunctionStub)(functionName, exprTypes.map((exprT, index) => [
            `arg${index}`,
            (0, utils_1.typeNameFromTypeNode)(exprT, this.ast),
            solc_typed_ast_1.DataLocation.CallData,
        ]), [['result', (0, nodeTemplates_1.createBytesTypeName)(this.ast), solc_typed_ast_1.DataLocation.CallData]], [], this.ast, sourceUnit ?? this.sourceUnit);
        return (0, functionGeneration_1.createCallToFunction)(functionStub, expressions, this.ast);
    }
    /**
     * Given a type list it generates a `encode` cairo function definition
     * that serializes the arguments into a list of felts
     * @param typesToEncode type list
     * @returns the name of the generated function
     */
    getOrCreate(typesToEncode) {
        const key = typesToEncode.map((t) => t.pp()).join(',');
        const existing = this.generatedFunctions.get(key);
        if (existing !== undefined) {
            return existing.name;
        }
        const parameters = [];
        const encodeCode = [];
        typesToEncode.forEach((type, index) => {
            const cairoType = cairoTypeSystem_1.CairoType.fromSol(type, this.ast, cairoTypeSystem_1.TypeConversionContext.CallDataRef);
            const prefix = `arg_${index}`;
            if ((0, nodeTypeProcessing_1.isDynamicArray)(type)) {
                (0, assert_1.default)(cairoType instanceof cairoTypeSystem_1.CairoDynArray);
                const arrayName = `${prefix}_dynamic`;
                parameters.push(` ${arrayName} : ${cairoType.typeName}`);
                const auxFuncName = this.getOrCreateAuxiliar(type);
                encodeCode.push(`assert decode_array[total_size] = ${arrayName}.len`, `let total_size = total_size + 1`, `let (total_size) = ${auxFuncName}(total_size, decode_array, 0, ${arrayName}.len, ${arrayName}.ptr)`);
            }
            else if (type instanceof solc_typed_ast_1.ArrayType) {
                parameters.push(`${prefix}_static : ${cairoType.toString()}`);
                const auxFuncName = this.getOrCreateAuxiliar(type);
                encodeCode.push(`let (total_size) = ${auxFuncName}(total_size, decode_array, ${prefix}_static)`);
            }
            else if ((0, nodeTypeProcessing_1.isStruct)(type)) {
                (0, assert_1.default)(cairoType instanceof cairoTypeSystem_1.CairoStruct);
                parameters.push(`${prefix}_${cairoType.name} : ${cairoType.typeName}`);
                const auxFuncName = this.getOrCreateAuxiliar(type);
                encodeCode.push(`let (total_size) = ${auxFuncName}(total_size, decode_array, ${prefix}_${cairoType.name})`);
            }
            else if ((0, nodeTypeProcessing_1.isValueType)(type)) {
                parameters.push(`${prefix} : ${cairoType.typeName}`);
                encodeCode.push(cairoType.width > 1
                    ? [
                        `assert decode_array[total_size] = ${prefix}.low`,
                        `assert decode_array[total_size + 1] = ${prefix}.high`,
                        `let total_size = total_size + 2`,
                    ].join('\n')
                    : [
                        `assert decode_array[total_size] = ${prefix}`,
                        `let total_size = total_size + 1`,
                    ].join('\n'));
            }
            else {
                throw new errors_1.NotSupportedYetError(`Decoding ${(0, astPrinter_1.printTypeNode)(type)} into felt dynamic array is not supported yet`);
            }
        });
        const resultStruct = this.externalArrayGen.getOrCreate((0, solc_typed_ast_1.typeNameToTypeNode)((0, nodeTemplates_1.createBytesTypeName)(this.ast)));
        const cairoParams = parameters.join(',');
        const funcName = `encode_as_felt${this.generatedFunctions.size}`;
        const code = [
            `func ${funcName}${IMPLICITS}(${cairoParams}) -> (calldata_array : ${resultStruct}):`,
            `   alloc_locals`,
            `   let total_size : felt = 0`,
            `   let (decode_array : felt*) = alloc()`,
            ...encodeCode,
            `   let result = ${resultStruct}(total_size, decode_array)`,
            `   return (result)`,
            `end`,
        ].join('\n');
        this.ast.registerImport(this.sourceUnit, 'starkware.cairo.common.alloc', 'alloc');
        this.generatedFunctions.set(key, { name: funcName, code: code });
        return funcName;
    }
    /**
     * Given a type it generates the appropiate auxiliar encoding function for this specific type.
     * @param type to encode (only arrays and structs allowed)
     * @returns name of the generated function
     */
    getOrCreateAuxiliar(type) {
        const key = type.pp();
        const existing = this.auxiliarGeneratedFunctions.get(key);
        if (existing !== undefined) {
            return existing.name;
        }
        const unexpectedTypeFunc = () => {
            throw new errors_1.NotSupportedYetError(`Encoding of type ${(0, astPrinter_1.printTypeNode)(type)} is not supported yet`);
        };
        const cairoFunc = (0, base_1.delegateBasedOnType)(type, (type) => this.generateDynamicArrayEncodeFunction(type), (type) => this.generateStaticArrayEncodeFunction(type), (type) => this.generateStructEncodeFunction(type), unexpectedTypeFunc, unexpectedTypeFunc);
        this.auxiliarGeneratedFunctions.set(key, cairoFunc);
        return cairoFunc.name;
    }
    /**
     * Generates caior code depending on the type. If it is a value type it generates
     * the appropiate instructions. If it is a an array or struct, it generates a function
     * call
     * @param type type to generate encoding code
     * @param currentElementName cairo variable to encode to felt
     * @returns generated code
     */
    generateEncodeCode(type, currentElementName) {
        if ((0, nodeTypeProcessing_1.isValueType)(type)) {
            const cairoType = cairoTypeSystem_1.CairoType.fromSol(type, this.ast, cairoTypeSystem_1.TypeConversionContext.CallDataRef);
            return cairoType.width > 1
                ? [
                    `assert to_array[to_index] = ${currentElementName}.low`,
                    `assert to_array[to_index + 1] = ${currentElementName}.high`,
                    `let to_index = to_index + 2`,
                ]
                : [`assert to_array[to_index] = ${currentElementName}`, `let to_index = to_index + 1`];
        }
        const auxFuncName = this.getOrCreateAuxiliar(type);
        return [`let (to_index) = ${auxFuncName}(to_index, to_array, ${currentElementName})`];
    }
    generateDynamicArrayEncodeFunction(type) {
        const cairoElementType = cairoTypeSystem_1.CairoType.fromSol((0, nodeTypeProcessing_1.getElementType)(type), this.ast, cairoTypeSystem_1.TypeConversionContext.CallDataRef);
        const elemenT = (0, nodeTypeProcessing_1.getElementType)(type);
        const funcName = `encode_dynamic_array${this.auxiliarGeneratedFunctions.size}`;
        const code = [
            `func ${funcName}${IMPLICITS}(`,
            `   to_index : felt,`,
            `   to_array : felt*,`,
            `   from_index: felt,`,
            `   from_size: felt,`,
            `   from_array: ${cairoElementType.toString()}*`,
            `) -> (total_copied : felt):`,
            `   alloc_locals`,
            `   if from_index == from_size:`,
            `      return (total_copied=to_index)`,
            `   end`,
            `   let current_element = from_array[from_index]`,
            ...this.generateEncodeCode(elemenT, 'current_element'),
            `   return ${funcName}(to_index, to_array, from_index + 1, from_size, from_array)`,
            `end`,
        ];
        return { name: funcName, code: code.join('\n') };
    }
    generateStructEncodeFunction(type) {
        (0, assert_1.default)(type.definition instanceof solc_typed_ast_1.StructDefinition);
        const encodeCode = type.definition.vMembers.map((varDecl, index) => {
            const varType = (0, solc_typed_ast_1.getNodeType)(varDecl, this.ast.compilerVersion);
            return [
                `let member_${index} = from_struct.${varDecl.name}`,
                ...this.generateEncodeCode(varType, `member_${index}`),
            ].join('\n');
        });
        const cairoType = cairoTypeSystem_1.CairoType.fromSol(type, this.ast, cairoTypeSystem_1.TypeConversionContext.CallDataRef);
        (0, assert_1.default)(cairoType instanceof cairoTypeSystem_1.CairoStruct);
        const funcName = `encode_struct_${cairoType.name}`;
        const code = [
            `func ${funcName}${IMPLICITS}(`,
            `   to_index : felt, to_array : felt*, from_struct : ${cairoType.toString()}`,
            `) -> (total_copied : felt):`,
            `    alloc_locals`,
            ...encodeCode,
            `    return (to_index)`,
            `end`,
        ];
        return { name: funcName, code: code.join('\n') };
    }
    generateStaticArrayEncodeFunction(type) {
        (0, assert_1.default)(type.size !== undefined);
        const cairoType = cairoTypeSystem_1.CairoType.fromSol(type, this.ast, cairoTypeSystem_1.TypeConversionContext.CallDataRef);
        const elemenT = type.elementT;
        const encodeCode = (0, utils_1.mapRange)((0, utils_1.narrowBigIntSafe)(type.size), (index) => {
            return [
                `let elem_${index} = from_static_array[${index}]`,
                ...this.generateEncodeCode(elemenT, `elem_${index}`),
            ].join('\n');
        });
        const funcName = `encode_static_size${type.size}_array_${this.auxiliarGeneratedFunctions.size}`;
        const code = [
            `func ${funcName}${IMPLICITS}(to_index : felt, to_array : felt*, from_static_array : ${cairoType.toString()}) -> (total_copied : felt):`,
            `    alloc_locals`,
            ...encodeCode,
            `    return (to_index)`,
            `end`,
        ];
        return { name: funcName, code: code.join('\n') };
    }
}
exports.EncodeAsFelt = EncodeAsFelt;
//# sourceMappingURL=encodeToFelt.js.map