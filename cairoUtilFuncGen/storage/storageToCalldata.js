"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageToCalldataGen = void 0;
const assert_1 = __importDefault(require("assert"));
const solc_typed_ast_1 = require("solc-typed-ast");
const astPrinter_1 = require("../../utils/astPrinter");
const cairoTypeSystem_1 = require("../../utils/cairoTypeSystem");
const errors_1 = require("../../utils/errors");
const functionGeneration_1 = require("../../utils/functionGeneration");
const nodeTypeProcessing_1 = require("../../utils/nodeTypeProcessing");
const utils_1 = require("../../utils/utils");
const base_1 = require("../base");
class StorageToCalldataGen extends base_1.StringIndexedFuncGen {
    constructor(dynArrayGen, storageReadGen, externalDynArrayStructConstructor, ast, sourceUnit) {
        super(ast, sourceUnit);
        this.dynArrayGen = dynArrayGen;
        this.storageReadGen = storageReadGen;
        this.externalDynArrayStructConstructor = externalDynArrayStructConstructor;
    }
    gen(storageLocation) {
        const storageType = (0, solc_typed_ast_1.generalizeType)((0, solc_typed_ast_1.getNodeType)(storageLocation, this.ast.compilerVersion))[0];
        const name = this.getOrCreate(storageType);
        const functionStub = (0, functionGeneration_1.createCairoFunctionStub)(name, [['loc', (0, utils_1.typeNameFromTypeNode)(storageType, this.ast), solc_typed_ast_1.DataLocation.Storage]], [['obj', (0, utils_1.typeNameFromTypeNode)(storageType, this.ast), solc_typed_ast_1.DataLocation.CallData]], ['syscall_ptr', 'pedersen_ptr', 'range_check_ptr'], this.ast, storageLocation);
        return (0, functionGeneration_1.createCallToFunction)(functionStub, [storageLocation], this.ast);
    }
    getOrCreate(type) {
        const key = type.pp();
        const existing = this.generatedFunctions.get(key);
        if (existing !== undefined) {
            return existing.name;
        }
        const unexpectedTypeFunc = () => {
            throw new errors_1.NotSupportedYetError(`Copying ${(0, astPrinter_1.printTypeNode)(type)} from storage to calldata is not supported yet`);
        };
        return (0, base_1.delegateBasedOnType)(type, (type) => this.createDynamicArrayCopyFunction(key, type), (type) => this.createStaticArrayCopyFunction(key, type), (type) => this.createStructCopyFunction(key, type), unexpectedTypeFunc, unexpectedTypeFunc);
    }
    createStructCopyFunction(key, structType) {
        (0, assert_1.default)(structType.definition instanceof solc_typed_ast_1.StructDefinition);
        const structDef = structType.definition;
        const cairoStruct = cairoTypeSystem_1.CairoType.fromSol(structType, this.ast, cairoTypeSystem_1.TypeConversionContext.StorageAllocation);
        const structName = `struct_${cairoStruct.toString()}`;
        const [copyInstructions, members] = this.generateStructCopyInstructions(structDef.vMembers.map((varDecl) => (0, solc_typed_ast_1.getNodeType)(varDecl, this.ast.compilerVersion)), 'member');
        const implicits = '{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr : felt}';
        const funcName = `ws_struct_${cairoStruct.toString()}_to_calldata`;
        const code = [
            `func ${funcName}${implicits}(loc : felt) -> (${structName} : ${cairoStruct.toString()}):`,
            `   alloc_locals`,
            ...copyInstructions,
            `   return (${cairoStruct.toString()}(${members.join(', ')}))`,
            `end`,
        ].join('\n');
        this.generatedFunctions.set(key, { name: funcName, code: code });
        return funcName;
    }
    createStaticArrayCopyFunction(key, arrayType) {
        (0, assert_1.default)(arrayType.size !== undefined);
        const cairoType = cairoTypeSystem_1.CairoType.fromSol(arrayType, this.ast, cairoTypeSystem_1.TypeConversionContext.CallDataRef);
        const [copyInstructions, members] = this.generateStructCopyInstructions((0, utils_1.mapRange)((0, utils_1.narrowBigIntSafe)(arrayType.size), () => arrayType.elementT), 'elem');
        const implicits = '{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr : felt}';
        const funcName = `ws_static_array_to_calldata${this.generatedFunctions.size}`;
        const code = [
            `func ${funcName}${implicits}(loc : felt) -> (static_array : ${cairoType.toString()}):`,
            `    alloc_locals`,
            ...copyInstructions,
            `    return ((${members.join(', ')}))`,
            `end`,
        ].join('\n');
        this.generatedFunctions.set(key, { name: funcName, code: code });
        return funcName;
    }
    createDynamicArrayCopyFunction(key, arrayType) {
        const elementT = (0, nodeTypeProcessing_1.getElementType)(arrayType);
        const structDef = cairoTypeSystem_1.CairoType.fromSol(arrayType, this.ast, cairoTypeSystem_1.TypeConversionContext.CallDataRef);
        (0, assert_1.default)(structDef instanceof cairoTypeSystem_1.CairoDynArray);
        this.externalDynArrayStructConstructor.getOrCreate(arrayType);
        const [arrayName, arrayLen] = this.dynArrayGen.gen(cairoTypeSystem_1.CairoType.fromSol(elementT, this.ast, cairoTypeSystem_1.TypeConversionContext.StorageAllocation));
        const cairoElementType = cairoTypeSystem_1.CairoType.fromSol(elementT, this.ast, cairoTypeSystem_1.TypeConversionContext.StorageAllocation);
        const ptrType = `${cairoElementType.toString()}*`;
        const implicits = '{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr : felt}';
        const funcName = `ws_dynamic_array_to_calldata${this.generatedFunctions.size}`;
        const code = [
            `func ${funcName}_write${implicits}(`,
            `   loc : felt,`,
            `   index : felt,`,
            `   len : felt,`,
            `   ptr : ${ptrType}) -> (ptr : ${ptrType}):`,
            `   alloc_locals`,
            `   if len == index:`,
            `       return (ptr)`,
            `   end`,
            `   let (index_uint256) = warp_uint256(index)`,
            `   let (elem_loc) = ${arrayName}.read(loc, index_uint256)`,
            `   let (elem) = ${this.storageReadGen.genFuncName(elementT)}(elem_loc)`,
            `   assert ptr[index] = elem`,
            `   return ${funcName}_write(loc, index + 1, len, ptr)`,
            `end`,
            `func ${funcName}${implicits}(loc : felt) -> (dyn_array_struct : ${structDef.name}):`,
            `   alloc_locals`,
            `   let (len_uint256) = ${arrayLen}.read(loc)`,
            `   let len = len_uint256.low + len_uint256.high*128`,
            `   let (ptr : ${ptrType}) = alloc()`,
            `   let (ptr : ${ptrType}) = ${funcName}_write(loc, 0, len, ptr)`,
            `   let dyn_array_struct = ${structDef.name}(len, ptr)`,
            `   return (dyn_array_struct)`,
            `end`,
        ].join('\n');
        this.requireImport('warplib.maths.int_conversions', 'warp_uint256');
        this.requireImport('starkware.cairo.common.uint256', 'Uint256');
        this.requireImport('starkware.cairo.common.alloc', 'alloc');
        this.generatedFunctions.set(key, { name: funcName, code: code });
        return funcName;
    }
    generateStructCopyInstructions(varDeclarations, tempVarName) {
        const members = [];
        let offset = 0;
        const copyInstructions = varDeclarations.map((varType, index) => {
            const varCairoTypeWidth = cairoTypeSystem_1.CairoType.fromSol(varType, this.ast, cairoTypeSystem_1.TypeConversionContext.CallDataRef).width;
            const funcName = this.storageReadGen.genFuncName(varType);
            const location = (0, base_1.add)('loc', offset);
            const memberName = `${tempVarName}_${index}`;
            members.push(memberName);
            offset += varCairoTypeWidth;
            return `    let (${memberName}) = ${funcName}(${location})`;
        });
        return [copyInstructions, members];
    }
}
exports.StorageToCalldataGen = StorageToCalldataGen;
//# sourceMappingURL=storageToCalldata.js.map