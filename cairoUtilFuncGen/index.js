"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CairoUtilFuncGen = void 0;
const utils_1 = require("../utils/utils");
const base_1 = require("./base");
const inputCheck_1 = require("./inputArgCheck/inputCheck");
const arrayLiteral_1 = require("./memory/arrayLiteral");
const memoryDynArrayLength_1 = require("./memory/memoryDynArrayLength");
const memoryMemberAccess_1 = require("./memory/memoryMemberAccess");
const memoryRead_1 = require("./memory/memoryRead");
const memoryStruct_1 = require("./memory/memoryStruct");
const memoryWrite_1 = require("./memory/memoryWrite");
const staticIndexAccess_1 = require("./memory/staticIndexAccess");
const dynArray_1 = require("./storage/dynArray");
const dynArrayIndexAccess_1 = require("./storage/dynArrayIndexAccess");
const dynArrayLength_1 = require("./storage/dynArrayLength");
const dynArrayPop_1 = require("./storage/dynArrayPop");
const dynArrayPushWithArg_1 = require("./storage/dynArrayPushWithArg");
const dynArrayPushWithoutArg_1 = require("./storage/dynArrayPushWithoutArg");
const calldataToMemory_1 = require("./calldata/calldataToMemory");
const externalDynArrayStructConstructor_1 = require("./calldata/externalDynArray/externalDynArrayStructConstructor");
const implicitArrayConversion_1 = require("./calldata/implicitArrayConversion");
const mappingIndexAccess_1 = require("./storage/mappingIndexAccess");
const staticArrayIndexAccess_1 = require("./storage/staticArrayIndexAccess");
const storageDelete_1 = require("./storage/storageDelete");
const storageMemberAccess_1 = require("./storage/storageMemberAccess");
const storageRead_1 = require("./storage/storageRead");
const storageToMemory_1 = require("./storage/storageToMemory");
const storageWrite_1 = require("./storage/storageWrite");
const memoryToCalldata_1 = require("./memory/memoryToCalldata");
const memoryToStorage_1 = require("./memory/memoryToStorage");
const calldataToStorage_1 = require("./calldata/calldataToStorage");
const copyToStorage_1 = require("./storage/copyToStorage");
const storageToCalldata_1 = require("./storage/storageToCalldata");
const implicitConversion_1 = require("./memory/implicitConversion");
const arrayConcat_1 = require("./memory/arrayConcat");
const enumInputCheck_1 = require("./enumInputCheck");
const encodeToFelt_1 = require("./utils/encodeToFelt");
class CairoUtilFuncGen {
    constructor(ast, sourceUnit) {
        this.implementation = {
            dynArray: new dynArray_1.DynArrayGen(ast, sourceUnit),
        };
        const storageReadGen = new storageRead_1.StorageReadGen(ast, sourceUnit);
        const storageDelete = new storageDelete_1.StorageDeleteGen(this.implementation.dynArray, storageReadGen, ast, sourceUnit);
        const memoryToStorage = new memoryToStorage_1.MemoryToStorageGen(this.implementation.dynArray, storageDelete, ast, sourceUnit);
        const storageWrite = new storageWrite_1.StorageWriteGen(ast, sourceUnit);
        const storageToStorage = new copyToStorage_1.StorageToStorageGen(this.implementation.dynArray, storageDelete, ast, sourceUnit);
        const calldataToStorage = new calldataToStorage_1.CalldataToStorageGen(this.implementation.dynArray, storageWrite, ast, sourceUnit);
        const externalDynArrayStructConstructor = new externalDynArrayStructConstructor_1.ExternalDynArrayStructConstructor(ast, sourceUnit);
        const memoryRead = new memoryRead_1.MemoryReadGen(ast, sourceUnit);
        const memoryWrite = new memoryWrite_1.MemoryWriteGen(ast, sourceUnit);
        const storageDynArrayIndexAccess = new dynArrayIndexAccess_1.DynArrayIndexAccessGen(this.implementation.dynArray, ast, sourceUnit);
        const callDataConvert = new implicitArrayConversion_1.ImplicitArrayConversion(storageWrite, this.implementation.dynArray, storageDynArrayIndexAccess, ast, sourceUnit);
        this.memory = {
            arrayLiteral: new arrayLiteral_1.MemoryArrayLiteralGen(ast, sourceUnit),
            concat: new arrayConcat_1.MemoryArrayConcat(ast, sourceUnit),
            convert: new implicitConversion_1.MemoryImplicitConversionGen(memoryWrite, memoryRead, ast, sourceUnit),
            dynArrayLength: new memoryDynArrayLength_1.MemoryDynArrayLengthGen(ast, sourceUnit),
            memberAccess: new memoryMemberAccess_1.MemoryMemberAccessGen(ast, sourceUnit),
            read: memoryRead,
            staticArrayIndexAccess: new staticIndexAccess_1.MemoryStaticArrayIndexAccessGen(ast, sourceUnit),
            struct: new memoryStruct_1.MemoryStructGen(ast, sourceUnit),
            toCallData: new memoryToCalldata_1.MemoryToCallDataGen(externalDynArrayStructConstructor, ast, sourceUnit),
            toStorage: memoryToStorage,
            write: memoryWrite,
        };
        this.storage = {
            delete: storageDelete,
            dynArrayIndexAccess: storageDynArrayIndexAccess,
            dynArrayLength: new dynArrayLength_1.DynArrayLengthGen(this.implementation.dynArray, ast, sourceUnit),
            dynArrayPop: new dynArrayPop_1.DynArrayPopGen(this.implementation.dynArray, storageDelete, ast, sourceUnit),
            dynArrayPush: {
                withArg: new dynArrayPushWithArg_1.DynArrayPushWithArgGen(this.implementation.dynArray, storageWrite, memoryToStorage, storageToStorage, calldataToStorage, callDataConvert, ast, sourceUnit),
                withoutArg: new dynArrayPushWithoutArg_1.DynArrayPushWithoutArgGen(this.implementation.dynArray, ast, sourceUnit),
            },
            mappingIndexAccess: new mappingIndexAccess_1.MappingIndexAccessGen(this.implementation.dynArray, ast, sourceUnit),
            memberAccess: new storageMemberAccess_1.StorageMemberAccessGen(ast, sourceUnit),
            read: storageReadGen,
            staticArrayIndexAccess: new staticArrayIndexAccess_1.StorageStaticArrayIndexAccessGen(ast, sourceUnit),
            toCallData: new storageToCalldata_1.StorageToCalldataGen(this.implementation.dynArray, storageReadGen, externalDynArrayStructConstructor, ast, sourceUnit),
            toMemory: new storageToMemory_1.StorageToMemoryGen(this.implementation.dynArray, ast, sourceUnit),
            toStorage: storageToStorage,
            write: storageWrite,
        };
        this.boundChecks = {
            inputCheck: new inputCheck_1.InputCheckGen(ast, sourceUnit),
            enums: new enumInputCheck_1.EnumInputCheck(ast, sourceUnit),
        };
        this.calldata = {
            dynArrayStructConstructor: externalDynArrayStructConstructor,
            toMemory: new calldataToMemory_1.CallDataToMemoryGen(ast, sourceUnit),
            convert: callDataConvert,
            toStorage: calldataToStorage,
        };
        this.utils = {
            encodeAsFelt: new encodeToFelt_1.EncodeAsFelt(externalDynArrayStructConstructor, ast, sourceUnit),
        };
    }
    getImports() {
        return (0, utils_1.mergeImports)(...this.getAllChildren().map((c) => c.getImports()));
    }
    getGeneratedCode() {
        return this.getAllChildren()
            .map((c) => c.getGeneratedCode())
            .sort((a, b) => {
            // This sort is needed to make sure the structs generated from CairoUtilGen are before the generated functions that
            // reference them. This sort is also order preserving in that it will only make sure the structs come before
            // any functions and not sort the struct/functions within their respective groups.
            if (a.slice(0, 1) < b.slice(0, 1)) {
                return 1;
            }
            else if (a.slice(0, 1) > b.slice(0, 1)) {
                return -1;
            }
            return 0;
        })
            .join('\n\n');
    }
    getAllChildren() {
        return getAllGenerators(this);
    }
}
exports.CairoUtilFuncGen = CairoUtilFuncGen;
function getAllGenerators(container) {
    if (typeof container !== 'object' || container === null)
        return [];
    if (container instanceof base_1.CairoUtilFuncGenBase)
        return [container];
    return Object.values(container).flatMap(getAllGenerators);
}
//# sourceMappingURL=index.js.map