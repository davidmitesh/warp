"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InputCheckGen = void 0;
const assert_1 = __importDefault(require("assert"));
const solc_typed_ast_1 = require("solc-typed-ast");
const cairoNodes_1 = require("../../ast/cairoNodes");
const astPrinter_1 = require("../../utils/astPrinter");
const cairoTypeSystem_1 = require("../../utils/cairoTypeSystem");
const errors_1 = require("../../utils/errors");
const functionGeneration_1 = require("../../utils/functionGeneration");
const nodeTemplates_1 = require("../../utils/nodeTemplates");
const utils_1 = require("../../utils/utils");
const base_1 = require("../base");
const nodeTypeProcessing_1 = require("../../utils/nodeTypeProcessing");
const cloning_1 = require("../../utils/cloning");
class InputCheckGen extends base_1.StringIndexedFuncGen {
    gen(nodeInput, typeToCheck, nodeInSourceUnit) {
        let functionInput;
        let isUint256 = false;
        if (nodeInput instanceof solc_typed_ast_1.VariableDeclaration) {
            functionInput = (0, nodeTemplates_1.createIdentifier)(nodeInput, this.ast);
        }
        else {
            functionInput = (0, cloning_1.cloneASTNode)(nodeInput, this.ast);
            const inputType = (0, solc_typed_ast_1.getNodeType)(nodeInput, this.ast.compilerVersion);
            this.ast.setContextRecursive(functionInput);
            isUint256 = inputType instanceof solc_typed_ast_1.IntType && inputType.nBits === 256;
            this.requireImport('warplib.maths.utils', 'narrow_safe');
        }
        this.sourceUnit = this.ast.getContainingRoot(nodeInSourceUnit);
        const name = this.getOrCreate(typeToCheck, isUint256);
        const functionStub = (0, functionGeneration_1.createCairoFunctionStub)(name, [
            [
                'ref_var',
                (0, utils_1.typeNameFromTypeNode)(typeToCheck, this.ast),
                (0, base_1.locationIfComplexType)(typeToCheck, solc_typed_ast_1.DataLocation.CallData),
            ],
        ], [], ['range_check_ptr'], this.ast, nodeInSourceUnit ?? nodeInput, {
            mutability: solc_typed_ast_1.FunctionStateMutability.Pure,
            stubKind: cairoNodes_1.FunctionStubKind.FunctionDefStub,
            acceptsRawDArray: (0, nodeTypeProcessing_1.isDynamicArray)(typeToCheck),
        });
        return (0, functionGeneration_1.createCallToFunction)(functionStub, [functionInput], this.ast);
    }
    getOrCreate(type, takesUint = false) {
        const key = type.pp();
        const existing = this.generatedFunctions.get(key);
        if (existing !== undefined) {
            return existing.name;
        }
        const unexpectedTypeFunc = () => {
            throw new errors_1.NotSupportedYetError(`Input check for ${(0, astPrinter_1.printTypeNode)(type)} not defined yet.`);
        };
        return (0, base_1.delegateBasedOnType)(type, (type) => this.createDynArrayInputCheck(key, this.generateFuncName(key), type), (type) => this.createStaticArrayInputCheck(key, this.generateFuncName(key), type), (type) => this.createStructInputCheck(key, this.generateFuncName(key), type), unexpectedTypeFunc, (type) => {
            if (type instanceof solc_typed_ast_1.FixedBytesType) {
                return this.createIntInputCheck(type.size * 8);
            }
            else if (type instanceof solc_typed_ast_1.IntType) {
                return this.createIntInputCheck(type.nBits);
            }
            else if (type instanceof solc_typed_ast_1.BoolType) {
                return this.createBoolInputCheck();
            }
            else if (type instanceof solc_typed_ast_1.UserDefinedType && type.definition instanceof solc_typed_ast_1.EnumDefinition) {
                return this.createEnumInputCheck(key, type, takesUint);
            }
            else if (type instanceof solc_typed_ast_1.AddressType) {
                return this.createAddressInputCheck();
            }
            else {
                return unexpectedTypeFunc();
            }
        });
    }
    generateFuncName(key) {
        const funcName = `extern_input_check${this.generatedFunctions.size}`;
        this.generatedFunctions.set(key, { name: funcName, code: '' });
        return funcName;
    }
    createIntInputCheck(bitWidth) {
        const funcName = `warp_external_input_check_int${bitWidth}`;
        this.requireImport('warplib.maths.external_input_check_ints', `warp_external_input_check_int${bitWidth}`);
        return funcName;
    }
    createAddressInputCheck() {
        const funcName = 'warp_external_input_check_address';
        this.requireImport('warplib.maths.external_input_check_address', `warp_external_input_check_address`);
        return funcName;
    }
    createStructInputCheck(key, funcName, type) {
        const implicits = '{range_check_ptr : felt}';
        const structDef = type.definition;
        (0, assert_1.default)(structDef instanceof solc_typed_ast_1.StructDefinition);
        const cairoType = cairoTypeSystem_1.CairoType.fromSol(type, this.ast, cairoTypeSystem_1.TypeConversionContext.CallDataRef);
        this.generatedFunctions.set(key, {
            name: funcName,
            code: [
                `func ${funcName}${implicits}(arg : ${cairoType.toString()}) -> ():`,
                `alloc_locals`,
                ...structDef.vMembers.map((decl) => {
                    const memberType = (0, solc_typed_ast_1.getNodeType)(decl, this.ast.compilerVersion);
                    this.checkForImport(memberType);
                    if ((0, nodeTypeProcessing_1.checkableType)(memberType)) {
                        const memberCheck = this.getOrCreate(memberType);
                        return [`${memberCheck}(arg.${decl.name})`];
                    }
                    else {
                        return '';
                    }
                }),
                `return ()`,
                `end`,
            ].join('\n'),
        });
        return funcName;
    }
    createStaticArrayInputCheck(key, funcName, type) {
        const implicits = '{range_check_ptr : felt}';
        (0, assert_1.default)(type.size !== undefined);
        const length = (0, utils_1.narrowBigIntSafe)(type.size);
        (0, assert_1.default)(length !== undefined);
        const cairoType = cairoTypeSystem_1.CairoType.fromSol(type, this.ast, cairoTypeSystem_1.TypeConversionContext.CallDataRef);
        const elementType = (0, solc_typed_ast_1.generalizeType)(type.elementT)[0];
        this.checkForImport(elementType);
        this.generatedFunctions.set(key, {
            name: funcName,
            code: [
                `func ${funcName}${implicits}(arg : ${cairoType.toString()}) -> ():`,
                `alloc_locals`,
                ...(0, utils_1.mapRange)(length, (index) => {
                    const indexCheck = this.getOrCreate(elementType);
                    return [`${indexCheck}(arg[${index}])`];
                }),
                `return ()`,
                `end`,
            ].join('\n'),
        });
        return funcName;
    }
    createBoolInputCheck() {
        const funcName = `warp_external_input_check_bool`;
        this.requireImport('warplib.maths.external_input_check_bool', `warp_external_input_check_bool`);
        return funcName;
    }
    createEnumInputCheck(key, type, takesUint = false) {
        const funcName = `extern_input_check${this.generatedFunctions.size}`;
        const implicits = '{range_check_ptr : felt}';
        const enumDef = type.definition;
        (0, assert_1.default)(enumDef instanceof solc_typed_ast_1.EnumDefinition);
        const nMembers = enumDef.vMembers.length;
        this.generatedFunctions.set(key, {
            name: funcName,
            code: [
                `func ${funcName}${implicits}(arg : ${takesUint ? 'Uint256' : 'felt'}) -> ():`,
                takesUint
                    ? [
                        '    let (arg_0) = narrow_safe(arg)',
                        `    let (inRange: felt) = is_le_felt(arg_0, ${nMembers - 1})`,
                    ].join('\n')
                    : `    let (inRange : felt) = is_le_felt(arg, ${nMembers - 1})`,
                `    with_attr error_message("Error: value out-of-bounds. Values passed to must be in enum range (0, ${nMembers - 1}]."):`,
                `        assert 1 = inRange`,
                `    end`,
                `    return ()`,
                `end`,
            ].join('\n'),
        });
        this.requireImport('starkware.cairo.common.math_cmp', 'is_le_felt');
        return funcName;
    }
    createDynArrayInputCheck(key, funcName, type) {
        const implicits = '{range_check_ptr : felt}';
        const cairoType = cairoTypeSystem_1.CairoType.fromSol(type, this.ast, cairoTypeSystem_1.TypeConversionContext.CallDataRef);
        (0, assert_1.default)(cairoType instanceof cairoTypeSystem_1.CairoDynArray);
        const ptrType = cairoType.vPtr;
        const elementType = (0, solc_typed_ast_1.generalizeType)((0, nodeTypeProcessing_1.getElementType)(type))[0];
        this.checkForImport(elementType);
        const indexCheck = [`${this.getOrCreate(elementType)}(ptr[0])`];
        this.generatedFunctions.set(key, {
            name: funcName,
            code: [
                `func ${funcName}${implicits}(len: felt, ptr : ${ptrType.toString()}) -> ():`,
                `    alloc_locals`,
                `    if len == 0:`,
                `        return ()`,
                `    end`,
                ...indexCheck,
                `   ${funcName}(len = len - 1, ptr = ptr + ${ptrType.to.width})`,
                `    return ()`,
                `end`,
            ].join('\n'),
        });
        return funcName;
    }
}
exports.InputCheckGen = InputCheckGen;
//# sourceMappingURL=inputCheck.js.map