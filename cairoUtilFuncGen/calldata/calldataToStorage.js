"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalldataToStorageGen = void 0;
const assert_1 = __importDefault(require("assert"));
const solc_typed_ast_1 = require("solc-typed-ast");
const astPrinter_1 = require("../../utils/astPrinter");
const cairoTypeSystem_1 = require("../../utils/cairoTypeSystem");
const errors_1 = require("../../utils/errors");
const functionGeneration_1 = require("../../utils/functionGeneration");
const nodeTypeProcessing_1 = require("../../utils/nodeTypeProcessing");
const utils_1 = require("../../utils/utils");
const base_1 = require("../base");
class CalldataToStorageGen extends base_1.StringIndexedFuncGen {
    constructor(dynArrayGen, storageWriteGen, ast, sourceUnit) {
        super(ast, sourceUnit);
        this.dynArrayGen = dynArrayGen;
        this.storageWriteGen = storageWriteGen;
    }
    gen(storageLocation, calldataLocation, nodeInSourceUnit) {
        const storageType = (0, solc_typed_ast_1.generalizeType)((0, solc_typed_ast_1.getNodeType)(storageLocation, this.ast.compilerVersion))[0];
        const calldataType = (0, solc_typed_ast_1.generalizeType)((0, solc_typed_ast_1.getNodeType)(calldataLocation, this.ast.compilerVersion))[0];
        const name = this.getOrCreate(calldataType);
        const functionStub = (0, functionGeneration_1.createCairoFunctionStub)(name, [
            ['loc', (0, utils_1.typeNameFromTypeNode)(storageType, this.ast), solc_typed_ast_1.DataLocation.Storage],
            ['dynarray', (0, utils_1.typeNameFromTypeNode)(calldataType, this.ast), solc_typed_ast_1.DataLocation.CallData],
        ], [['loc', (0, utils_1.typeNameFromTypeNode)(storageType, this.ast), solc_typed_ast_1.DataLocation.Storage]], ['syscall_ptr', 'pedersen_ptr', 'range_check_ptr'], this.ast, nodeInSourceUnit ?? storageLocation);
        return (0, functionGeneration_1.createCallToFunction)(functionStub, [storageLocation, calldataLocation], this.ast);
    }
    getOrCreate(type) {
        const key = type.pp();
        const existing = this.generatedFunctions.get(key);
        if (existing !== undefined) {
            return existing.name;
        }
        const unexpectedTypeFunc = () => {
            throw new errors_1.NotSupportedYetError(`Copying ${(0, astPrinter_1.printTypeNode)(type)} from calldata to storage is not supported yet`);
        };
        return (0, base_1.delegateBasedOnType)(type, (type) => this.createDynamicArrayCopyFunction(key, type), (type) => this.createStaticArrayCopyFunction(key, type), (type) => this.createStructCopyFunction(key, type), unexpectedTypeFunc, unexpectedTypeFunc);
    }
    createStructCopyFunction(key, structType) {
        (0, assert_1.default)(structType.definition instanceof solc_typed_ast_1.StructDefinition);
        const structDef = structType.definition;
        const cairoStruct = cairoTypeSystem_1.CairoType.fromSol(structType, this.ast, cairoTypeSystem_1.TypeConversionContext.StorageAllocation);
        const structName = `struct_${cairoStruct.toString()}`;
        const members = structDef.vMembers.map((varDecl) => `${structName}.${varDecl.name}`);
        const copyInstructions = this.generateStructCopyInstructions(structDef.vMembers.map((varDecl) => (0, solc_typed_ast_1.getNodeType)(varDecl, this.ast.compilerVersion)), members);
        const implicits = '{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr : felt}';
        const funcName = `cd_struct_${cairoStruct.toString()}_to_storage`;
        const code = [
            `func ${funcName}${implicits}(loc : felt, ${structName} : ${cairoStruct.toString()}) -> (loc : felt):`,
            `   alloc_locals`,
            ...copyInstructions,
            `   return (loc)`,
            `end`,
        ].join('\n');
        this.generatedFunctions.set(key, { name: funcName, code: code });
        return funcName;
    }
    createStaticArrayCopyFunction(key, arrayType) {
        (0, assert_1.default)(arrayType.size !== undefined);
        const cairoType = cairoTypeSystem_1.CairoType.fromSol(arrayType, this.ast, cairoTypeSystem_1.TypeConversionContext.CallDataRef);
        const len = (0, utils_1.narrowBigIntSafe)(arrayType.size);
        const elems = (0, utils_1.mapRange)(len, (n) => `static_array[${n}]`);
        const copyInstructions = this.generateStructCopyInstructions((0, utils_1.mapRange)(len, () => arrayType.elementT), elems);
        const implicits = '{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr : felt}';
        const funcName = `cd_static_array_to_storage${this.generatedFunctions.size}`;
        const code = [
            `func ${funcName}${implicits}(loc : felt, static_array : ${cairoType.toString()}) -> (loc : felt):`,
            `   alloc_locals`,
            ...copyInstructions,
            `   return (loc)`,
            `end`,
        ].join('\n');
        this.generatedFunctions.set(key, { name: funcName, code: code });
        return funcName;
    }
    createDynamicArrayCopyFunction(key, arrayType) {
        const elementT = (0, nodeTypeProcessing_1.getElementType)(arrayType);
        const structDef = cairoTypeSystem_1.CairoType.fromSol(arrayType, this.ast, cairoTypeSystem_1.TypeConversionContext.CallDataRef);
        (0, assert_1.default)(structDef instanceof cairoTypeSystem_1.CairoDynArray);
        const [arrayName, arrayLen] = this.dynArrayGen.gen(cairoTypeSystem_1.CairoType.fromSol(elementT, this.ast, cairoTypeSystem_1.TypeConversionContext.StorageAllocation));
        const cairoElementType = cairoTypeSystem_1.CairoType.fromSol(elementT, this.ast, cairoTypeSystem_1.TypeConversionContext.StorageAllocation);
        const copyCode = `${this.storageWriteGen.getOrCreate(elementT)}(elem_loc, elem[index])`;
        const implicits = '{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr : felt}';
        const pointerType = `${cairoElementType.toString()}*`;
        const funcName = `cd_dynamic_array_to_storage${this.generatedFunctions.size}`;
        const code = [
            `func ${funcName}_write${implicits}(loc : felt, index : felt, len : felt, elem: ${pointerType}):`,
            `   alloc_locals`,
            `   if index == len:`,
            `       return ()`,
            `   end`,
            `   let (index_uint256) = warp_uint256(index)`,
            `   let (elem_loc) = ${arrayName}.read(loc, index_uint256)`,
            `   if elem_loc == 0:`,
            `       let (elem_loc) = WARP_USED_STORAGE.read() `,
            `       WARP_USED_STORAGE.write(elem_loc + ${cairoElementType.width})`,
            `       ${arrayName}.write(loc, index_uint256, elem_loc)`,
            `       ${copyCode}`,
            `       return ${funcName}_write(loc, index + 1, len, elem)`,
            `   else:`,
            `       ${copyCode}`,
            `       return ${funcName}_write(loc, index + 1, len, elem)`,
            `   end`,
            `end`,
            `func ${funcName}${implicits}(loc : felt, dyn_array_struct : ${structDef.name}) -> (loc : felt): `,
            `   alloc_locals`,
            `   let (len_uint256) = warp_uint256(dyn_array_struct.len)`,
            `   ${arrayLen}.write(loc, len_uint256)`,
            `   ${funcName}_write(loc, 0, dyn_array_struct.len, dyn_array_struct.ptr)`,
            `   return (loc)`,
            `end`,
        ].join('\n');
        this.requireImport('warplib.maths.int_conversions', 'warp_uint256');
        this.generatedFunctions.set(key, { name: funcName, code: code });
        return funcName;
    }
    generateStructCopyInstructions(varTypes, names) {
        let offset = 0;
        const copyInstructions = varTypes.map((varType, index) => {
            const varCairoTypeWidth = cairoTypeSystem_1.CairoType.fromSol(varType, this.ast, cairoTypeSystem_1.TypeConversionContext.CallDataRef).width;
            const funcName = this.storageWriteGen.getOrCreate(varType);
            const location = (0, base_1.add)('loc', offset);
            offset += varCairoTypeWidth;
            return `    ${funcName}(${location}, ${names[index]})`;
        });
        return copyInstructions;
    }
}
exports.CalldataToStorageGen = CalldataToStorageGen;
//# sourceMappingURL=calldataToStorage.js.map