"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageDeleteGen = void 0;
const assert_1 = __importDefault(require("assert"));
const solc_typed_ast_1 = require("solc-typed-ast");
const cairoTypeSystem_1 = require("../../utils/cairoTypeSystem");
const errors_1 = require("../../utils/errors");
const functionGeneration_1 = require("../../utils/functionGeneration");
const nodeTypeProcessing_1 = require("../../utils/nodeTypeProcessing");
const utils_1 = require("../../utils/utils");
const utils_2 = require("../../warplib/utils");
const base_1 = require("../base");
class StorageDeleteGen extends base_1.StringIndexedFuncGen {
    constructor(dynArrayGen, storageReadGen, ast, sourceUnit) {
        super(ast, sourceUnit);
        this.dynArrayGen = dynArrayGen;
        this.storageReadGen = storageReadGen;
        this.nothingHandlerGen = false;
    }
    gen(node, nodeInSourceUnit) {
        const nodeType = dereferenceType((0, solc_typed_ast_1.getNodeType)(node, this.ast.compilerVersion));
        const functionName = this.getOrCreate(nodeType);
        const functionStub = (0, functionGeneration_1.createCairoFunctionStub)(functionName, [['loc', (0, utils_1.typeNameFromTypeNode)(nodeType, this.ast), solc_typed_ast_1.DataLocation.Storage]], [], ['syscall_ptr', 'pedersen_ptr', 'range_check_ptr'], this.ast, nodeInSourceUnit ?? node);
        return (0, functionGeneration_1.createCallToFunction)(functionStub, [node], this.ast);
    }
    genFuncName(node) {
        return this.getOrCreate(node);
    }
    genAuxFuncName(node) {
        return `${this.getOrCreate(node)}_elem`;
    }
    getOrCreate(type) {
        const key = type.pp();
        const existing = this.generatedFunctions.get(key);
        if (existing !== undefined) {
            return existing.name;
        }
        const cairoFuncName = (0, base_1.delegateBasedOnType)(type, () => `WS${this.generatedFunctions.size}_DYNAMIC_ARRAY_DELETE`, () => `WS${this.generatedFunctions.size}_STATIC_ARRAY_DELETE`, (_type, def) => `WS_STRUCT_${def.name}_DELETE`, () => `WSMAP_DELETE`, () => `WS${this.generatedFunctions.size}_DELETE`);
        this.generatedFunctions.set(key, {
            name: cairoFuncName,
            get code() {
                throw new errors_1.TranspileFailedError('Tried accessing code yet to be generated');
            },
        });
        const cairoFunc = (0, base_1.delegateBasedOnType)(type, (type) => this.deleteDynamicArray(type, cairoFuncName), (type) => {
            (0, assert_1.default)(type.size !== undefined);
            return type.size <= 5
                ? this.deleteSmallStaticArray(type, cairoFuncName)
                : this.deleteLargeStaticArray(type, cairoFuncName);
        }, (_type, def) => this.deleteStruct(def, cairoFuncName), () => this.deleteNothing(cairoFuncName), () => this.deleteGeneric(cairoTypeSystem_1.CairoType.fromSol(type, this.ast), cairoFuncName));
        // WSMAP_DELETE can be keyed with multiple types but since its definition
        // is always the same we want to make sure its not duplicated or else it
        // clashes with itself.
        if (cairoFunc.name === 'WSMAP_DELETE' && !this.nothingHandlerGen) {
            this.nothingHandlerGen = true;
        }
        else if (cairoFunc.name === 'WSMAP_DELETE' && this.nothingHandlerGen) {
            this.generatedFunctions.set(key, { ...cairoFunc, code: '' });
            return cairoFunc.name;
        }
        this.generatedFunctions.set(key, cairoFunc);
        return cairoFunc.name;
    }
    deleteGeneric(cairoType, funcName) {
        const implicits = '{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr : felt}';
        return {
            name: funcName,
            code: [
                `func ${funcName}${implicits}(loc: felt):`,
                ...(0, utils_1.mapRange)(cairoType.width, (n) => `    WARP_STORAGE.write(${(0, base_1.add)('loc', n)}, 0)`),
                `    return ()`,
                `end`,
            ].join('\n'),
        };
    }
    deleteDynamicArray(type, funcName) {
        const implicits = '{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr : felt}';
        const elementT = dereferenceType((0, nodeTypeProcessing_1.getElementType)(type));
        const [arrayName, lengthName] = this.dynArrayGen.gen(cairoTypeSystem_1.CairoType.fromSol(elementT, this.ast, cairoTypeSystem_1.TypeConversionContext.StorageAllocation));
        const deleteCode = requiresReadBeforeRecursing(elementT)
            ? [
                `   let (elem_id) = ${this.storageReadGen.genFuncName(elementT)}(elem_loc)`,
                `   ${this.getOrCreate(elementT)}(elem_id)`,
            ]
            : [`    ${this.getOrCreate(elementT)}(elem_loc)`];
        const deleteFunc = [
            `func ${funcName}_elem${implicits}(loc : felt, index : Uint256, length : Uint256):`,
            `     alloc_locals`,
            `     let (stop) = uint256_eq(index, length)`,
            `     if stop == 1:`,
            `        return ()`,
            `     end`,
            `     let (elem_loc) = ${arrayName}.read(loc, index)`,
            ...deleteCode,
            `     let (next_index, _) = uint256_add(index, ${(0, utils_2.uint256)(1)})`,
            `     return ${funcName}_elem(loc, next_index, length)`,
            `end`,
            `func ${funcName}${implicits}(loc : felt):`,
            `   alloc_locals`,
            `   let (length) = ${lengthName}.read(loc)`,
            `   ${lengthName}.write(loc, ${(0, utils_2.uint256)(0)})`,
            `   return ${funcName}_elem(loc, ${(0, utils_2.uint256)(0)}, length)`,
            `end`,
        ].join('\n');
        this.requireImport('starkware.cairo.common.uint256', 'uint256_eq');
        this.requireImport('starkware.cairo.common.uint256', 'uint256_add');
        this.requireImport('starkware.cairo.common.uint256', 'Uint256');
        return { name: funcName, code: deleteFunc };
    }
    deleteSmallStaticArray(type, funcName) {
        (0, assert_1.default)(type.size !== undefined);
        const implicits = '{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr : felt}';
        const code = [
            `   alloc_locals`,
            ...this.generateStructDeletionCode((0, utils_1.mapRange)((0, utils_1.narrowBigIntSafe)(type.size), () => type.elementT)),
            `   return ()`,
            `end`,
        ];
        return {
            name: funcName,
            code: [`func ${funcName}${implicits}(loc : felt):`, ...code].join('\n'),
        };
    }
    deleteLargeStaticArray(type, funcName) {
        (0, assert_1.default)(type.size !== undefined);
        const implicits = '{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr : felt}';
        const elementT = dereferenceType(type.elementT);
        const elementTWidht = cairoTypeSystem_1.CairoType.fromSol(elementT, this.ast, cairoTypeSystem_1.TypeConversionContext.StorageAllocation).width;
        const deleteCode = requiresReadBeforeRecursing(elementT)
            ? [
                `   let (elem_id) = ${this.storageReadGen.genFuncName(elementT)}(loc)`,
                `   ${this.getOrCreate(elementT)}(elem_id)`,
            ]
            : [`    ${this.getOrCreate(elementT)}(loc)`];
        const length = (0, utils_1.narrowBigIntSafe)(type.size);
        const nextLoc = (0, base_1.add)('loc', elementTWidht);
        const deleteFunc = [
            `func ${funcName}_elem${implicits}(loc : felt, index : felt):`,
            `     alloc_locals`,
            `     if index == ${length}:`,
            `        return ()`,
            `     end`,
            `     let next_index = index + 1`,
            ...deleteCode,
            `     return ${funcName}_elem(${nextLoc}, next_index)`,
            `end`,
            `func ${funcName}${implicits}(loc : felt):`,
            `   alloc_locals`,
            `   return ${funcName}_elem(loc, 0)`,
            `end`,
        ].join('\n');
        this.requireImport('starkware.cairo.common.uint256', 'uint256_eq');
        this.requireImport('starkware.cairo.common.uint256', 'uint256_sub');
        this.requireImport('starkware.cairo.common.uint256', 'Uint256');
        return { name: funcName, code: deleteFunc };
    }
    deleteStruct(structDef, funcName) {
        const implicits = '{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr : felt}';
        // struct names are unique
        const deleteFunc = [
            `func ${funcName}${implicits}(loc : felt):`,
            `   alloc_locals`,
            ...this.generateStructDeletionCode(structDef.vMembers.map((varDecl) => (0, solc_typed_ast_1.getNodeType)(varDecl, this.ast.compilerVersion))),
            `   return ()`,
            `end`,
        ].join('\n');
        return { name: funcName, code: deleteFunc };
    }
    deleteNothing(funcName) {
        const implicits = '{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr : felt}';
        return {
            name: funcName,
            code: [`func ${funcName}${implicits}(loc: felt):`, `    return ()`, `end`].join('\n'),
        };
    }
    generateStructDeletionCode(varDeclarations, index = 0, offset = 0) {
        if (index >= varDeclarations.length)
            return [];
        const varType = dereferenceType(varDeclarations[index]);
        const varWidth = cairoTypeSystem_1.CairoType.fromSol(varType, this.ast, cairoTypeSystem_1.TypeConversionContext.StorageAllocation).width;
        const deleteLoc = (0, base_1.add)('loc', offset);
        const deleteCode = requiresReadBeforeRecursing(varType)
            ? [
                `   let (elem_id) = ${this.storageReadGen.genFuncName(varType)}(${deleteLoc})`,
                `   ${this.getOrCreate(varType)}(elem_id)`,
            ]
            : [`    ${this.getOrCreate(varType)}(${deleteLoc})`];
        return [
            ...deleteCode,
            ...this.generateStructDeletionCode(varDeclarations, index + 1, offset + varWidth),
        ];
    }
}
exports.StorageDeleteGen = StorageDeleteGen;
function dereferenceType(type) {
    return (0, solc_typed_ast_1.generalizeType)(type)[0];
}
function requiresReadBeforeRecursing(type) {
    if (type instanceof solc_typed_ast_1.PointerType)
        return requiresReadBeforeRecursing(type.to);
    return (0, nodeTypeProcessing_1.isDynamicArray)(type) || type instanceof solc_typed_ast_1.MappingType;
}
//# sourceMappingURL=storageDelete.js.map