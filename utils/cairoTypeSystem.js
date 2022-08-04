"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateCallDataDynArrayStructName = exports.CairoUint256 = exports.MemoryLocation = exports.WarpLocation = exports.CairoPointer = exports.CairoTuple = exports.CairoDynArray = exports.CairoStruct = exports.CairoFelt = exports.CairoType = exports.TypeConversionContext = void 0;
const assert_1 = __importDefault(require("assert"));
const solc_typed_ast_1 = require("solc-typed-ast");
const astPrinter_1 = require("./astPrinter");
const errors_1 = require("./errors");
const utils_1 = require("./utils");
var TypeConversionContext;
(function (TypeConversionContext) {
    TypeConversionContext[TypeConversionContext["MemoryAllocation"] = 0] = "MemoryAllocation";
    TypeConversionContext[TypeConversionContext["Ref"] = 1] = "Ref";
    TypeConversionContext[TypeConversionContext["StorageAllocation"] = 2] = "StorageAllocation";
    TypeConversionContext[TypeConversionContext["CallDataRef"] = 3] = "CallDataRef";
})(TypeConversionContext = exports.TypeConversionContext || (exports.TypeConversionContext = {}));
class CairoType {
    get typeName() {
        return this.toString();
    }
    static fromSol(tp, ast, context = TypeConversionContext.Ref) {
        if (tp instanceof solc_typed_ast_1.AddressType) {
            return new CairoFelt();
        }
        else if (tp instanceof solc_typed_ast_1.ArrayType) {
            if (tp.size === undefined) {
                if (context === TypeConversionContext.CallDataRef) {
                    return new CairoDynArray(generateCallDataDynArrayStructName(tp.elementT, ast), CairoType.fromSol(tp.elementT, ast, context));
                }
                else if (context === TypeConversionContext.Ref) {
                    return new MemoryLocation();
                }
                return new WarpLocation();
            }
            else if (context === TypeConversionContext.Ref) {
                return new MemoryLocation();
            }
            else {
                const recursionContext = context === TypeConversionContext.MemoryAllocation ? TypeConversionContext.Ref : context;
                const elementType = CairoType.fromSol(tp.elementT, ast, recursionContext);
                const narrowedLength = (0, utils_1.narrowBigIntSafe)(tp.size, `Arrays of very large size (${tp.size.toString()}) are not supported`);
                return new CairoTuple(Array(narrowedLength).fill(elementType));
            }
        }
        else if (tp instanceof solc_typed_ast_1.BoolType) {
            return new CairoFelt();
        }
        else if (tp instanceof solc_typed_ast_1.BuiltinType) {
            throw new errors_1.NotSupportedYetError('Serialising BuiltinType not supported yet');
        }
        else if (tp instanceof solc_typed_ast_1.BuiltinStructType) {
            throw new errors_1.NotSupportedYetError('Serialising BuiltinStructType not supported yet');
        }
        else if (tp instanceof solc_typed_ast_1.BytesType || tp instanceof solc_typed_ast_1.StringType) {
            switch (context) {
                case TypeConversionContext.CallDataRef:
                    return new CairoDynArray(generateCallDataDynArrayStructName(new solc_typed_ast_1.FixedBytesType(1), ast), new CairoFelt());
                case TypeConversionContext.Ref:
                    return new MemoryLocation();
                default:
                    return new WarpLocation();
            }
        }
        else if (tp instanceof solc_typed_ast_1.FixedBytesType) {
            return tp.size === 32 ? exports.CairoUint256 : new CairoFelt();
        }
        else if (tp instanceof solc_typed_ast_1.FunctionType) {
            throw new errors_1.NotSupportedYetError('Serialising FunctionType not supported yet');
        }
        else if (tp instanceof solc_typed_ast_1.IntType) {
            return tp.nBits > 251 ? exports.CairoUint256 : new CairoFelt();
        }
        else if (tp instanceof solc_typed_ast_1.MappingType) {
            return new WarpLocation();
        }
        else if (tp instanceof solc_typed_ast_1.PointerType) {
            if (context !== TypeConversionContext.Ref) {
                return CairoType.fromSol(tp.to, ast, context);
            }
            return new MemoryLocation();
        }
        else if (tp instanceof solc_typed_ast_1.UserDefinedType) {
            const specificType = tp.definition.type;
            if (tp.definition instanceof solc_typed_ast_1.EnumDefinition) {
                return CairoType.fromSol((0, solc_typed_ast_1.enumToIntType)(tp.definition), ast);
            }
            else if (tp.definition instanceof solc_typed_ast_1.StructDefinition) {
                if (context === TypeConversionContext.Ref) {
                    return new MemoryLocation();
                }
                else if (context === TypeConversionContext.MemoryAllocation) {
                    return new CairoStruct((0, utils_1.mangleStructName)(tp.definition), new Map(tp.definition.vMembers.map((decl) => [
                        decl.name,
                        CairoType.fromSol((0, solc_typed_ast_1.getNodeType)(decl, ast.compilerVersion), ast, TypeConversionContext.Ref),
                    ])));
                }
                else {
                    return new CairoStruct((0, utils_1.mangleStructName)(tp.definition), new Map(tp.definition.vMembers.map((decl) => [
                        decl.name,
                        CairoType.fromSol((0, solc_typed_ast_1.getNodeType)(decl, ast.compilerVersion), ast, context),
                    ])));
                }
            }
            else if (tp.definition instanceof solc_typed_ast_1.ContractDefinition) {
                return new CairoFelt();
            }
            else if (tp.definition instanceof solc_typed_ast_1.UserDefinedValueTypeDefinition) {
                return CairoType.fromSol((0, solc_typed_ast_1.getNodeType)(tp.definition.underlyingType, ast.compilerVersion), ast, context);
            }
            throw new errors_1.TranspileFailedError(`Failed to analyse user defined ${specificType} type as cairo type}`);
        }
        else {
            throw new Error(`Don't know how to convert type ${(0, astPrinter_1.printTypeNode)(tp)}`);
        }
    }
}
exports.CairoType = CairoType;
class CairoFelt extends CairoType {
    get fullStringRepresentation() {
        return '[Felt]';
    }
    toString() {
        return 'felt';
    }
    get width() {
        return 1;
    }
    serialiseMembers(name) {
        return [name];
    }
}
exports.CairoFelt = CairoFelt;
class CairoStruct extends CairoType {
    constructor(name, members) {
        super();
        this.name = name;
        this.members = members;
    }
    get fullStringRepresentation() {
        return `[Struct ${this.name}]${[...this.members.entries()].map(([name, type]) => `(${name}: ${type.fullStringRepresentation})`)}`;
    }
    toString() {
        return this.name;
    }
    get width() {
        return [...this.members.values()].reduce((acc, t) => acc + t.width, 0);
    }
    serialiseMembers(name) {
        return [...this.members.entries()].flatMap(([memberName, type]) => type.serialiseMembers(`${name}.${memberName}`));
    }
    offsetOf(memberName) {
        let offset = 0;
        for (const [name, type] of this.members) {
            if (name === memberName)
                return offset;
            offset += type.width;
        }
        throw new errors_1.TranspileFailedError(`Attempted to find offset of non-existant member ${memberName} in ${this.name}`);
    }
}
exports.CairoStruct = CairoStruct;
class CairoDynArray extends CairoStruct {
    constructor(name, ptr_member) {
        super(name, new Map([
            ['len', new CairoFelt()],
            ['ptr', new CairoPointer(ptr_member)],
        ]));
        this.name = name;
        this.ptr_member = ptr_member;
    }
    get vPtr() {
        const ptr_member = this.members.get('ptr');
        (0, assert_1.default)(ptr_member instanceof CairoPointer);
        return ptr_member;
    }
    get vLen() {
        const len_member = this.members.get('len');
        (0, assert_1.default)(len_member instanceof CairoFelt);
        return len_member;
    }
}
exports.CairoDynArray = CairoDynArray;
class CairoTuple extends CairoType {
    constructor(members) {
        super();
        this.members = members;
    }
    get fullStringRepresentation() {
        return `[Tuple]${this.members.map((type) => `(${type.fullStringRepresentation})`)}`;
    }
    toString() {
        return `(${this.members.map((m) => m.toString()).join(', ')})`;
    }
    get typeName() {
        return `${this.members.map((m) => m.typeName).join('x')}`;
    }
    get width() {
        return this.members.reduce((acc, t) => acc + t.width, 0);
    }
    serialiseMembers(name) {
        return this.members.flatMap((memberType, index) => memberType.serialiseMembers(`${name}[${index}]`));
    }
}
exports.CairoTuple = CairoTuple;
class CairoPointer extends CairoType {
    constructor(to) {
        super();
        this.to = to;
    }
    get fullStringRepresentation() {
        return `[Pointer](${this.to.fullStringRepresentation})`;
    }
    toString() {
        return `${this.to.toString()}*`;
    }
    get width() {
        return 1;
    }
    serialiseMembers(name) {
        return [name];
    }
}
exports.CairoPointer = CairoPointer;
class WarpLocation extends CairoFelt {
    get typeName() {
        return 'warp_id';
    }
    get fullStringRepresentation() {
        return `[Id]`;
    }
}
exports.WarpLocation = WarpLocation;
class MemoryLocation extends CairoFelt {
}
exports.MemoryLocation = MemoryLocation;
exports.CairoUint256 = new CairoStruct('Uint256', new Map([
    ['low', new CairoFelt()],
    ['high', new CairoFelt()],
]));
const cd_dynarray_prefix = 'cd_dynarray_';
function generateCallDataDynArrayStructName(elementType, ast) {
    return `${cd_dynarray_prefix}${generateCallDataDynArrayStructNameInner(elementType, ast)}`;
}
exports.generateCallDataDynArrayStructName = generateCallDataDynArrayStructName;
function generateCallDataDynArrayStructNameInner(elementType, ast) {
    if (elementType instanceof solc_typed_ast_1.PointerType) {
        return generateCallDataDynArrayStructNameInner(elementType.to, ast);
    }
    else if (elementType instanceof solc_typed_ast_1.ArrayType) {
        if (elementType.size !== undefined) {
            return `arr_${(0, utils_1.narrowBigIntSafe)(elementType.size)}_${generateCallDataDynArrayStructNameInner(elementType.elementT, ast)}`;
        }
        else {
            // This is included only for completeness. Starknet does not currently allow dynarrays of dynarrays to be passed
            return `arr_d_${generateCallDataDynArrayStructNameInner(elementType.elementT, ast)}`;
        }
    }
    else if (elementType instanceof solc_typed_ast_1.BytesType) {
        return `arr_d_felt`;
    }
    else if (elementType instanceof solc_typed_ast_1.UserDefinedType &&
        elementType.definition instanceof solc_typed_ast_1.StructDefinition) {
        return (0, utils_1.mangleStructName)(elementType.definition);
    }
    else {
        return CairoType.fromSol(elementType, ast, TypeConversionContext.CallDataRef).toString();
    }
}
//# sourceMappingURL=cairoTypeSystem.js.map