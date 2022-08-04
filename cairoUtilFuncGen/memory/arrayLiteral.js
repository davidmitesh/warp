"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryArrayLiteralGen = void 0;
const assert = require("assert");
const solc_typed_ast_1 = require("solc-typed-ast");
const astPrinter_1 = require("../../utils/astPrinter");
const cairoTypeSystem_1 = require("../../utils/cairoTypeSystem");
const cloning_1 = require("../../utils/cloning");
const functionGeneration_1 = require("../../utils/functionGeneration");
const nodeTemplates_1 = require("../../utils/nodeTemplates");
const nodeTypeProcessing_1 = require("../../utils/nodeTypeProcessing");
const typeConstructs_1 = require("../../utils/typeConstructs");
const utils_1 = require("../../utils/utils");
const utils_2 = require("../../warplib/utils");
const base_1 = require("../base");
/*
  Converts [a,b,c] and "abc" into WM0_arr(a,b,c), which allocates new space in warp_memory
  and assigns the given values into that space, returning the location of the
  start of the array
*/
class MemoryArrayLiteralGen extends base_1.StringIndexedFuncGen {
    stringGen(node) {
        // Encode the literal to the uint-8 byte representation
        assert(node.kind === solc_typed_ast_1.LiteralKind.String ||
            node.kind === solc_typed_ast_1.LiteralKind.UnicodeString ||
            solc_typed_ast_1.LiteralKind.HexString);
        const size = node.hexValue.length / 2;
        const baseType = new solc_typed_ast_1.FixedBytesType(1);
        const baseTypeName = (0, utils_1.typeNameFromTypeNode)(baseType, this.ast);
        const name = this.getOrCreate(baseType, size, true);
        const stub = (0, functionGeneration_1.createCairoFunctionStub)(name, (0, utils_1.mapRange)(size, (n) => [`e${n}`, (0, cloning_1.cloneASTNode)(baseTypeName, this.ast), solc_typed_ast_1.DataLocation.Default]), [['arr', (0, nodeTemplates_1.createStringTypeName)(false, this.ast), solc_typed_ast_1.DataLocation.Memory]], ['range_check_ptr', 'warp_memory'], this.ast, node);
        return (0, functionGeneration_1.createCallToFunction)(stub, (0, utils_1.mapRange)(size, (n) => (0, nodeTemplates_1.createNumberLiteral)(parseInt(node.hexValue.slice(2 * n, 2 * n + 2), 16), this.ast)), this.ast);
    }
    tupleGen(node) {
        const elements = node.vOriginalComponents.filter(typeConstructs_1.notNull);
        assert(elements.length === node.vOriginalComponents.length);
        const type = (0, solc_typed_ast_1.generalizeType)((0, solc_typed_ast_1.getNodeType)(node, this.ast.compilerVersion))[0];
        assert(type instanceof solc_typed_ast_1.ArrayType || type instanceof solc_typed_ast_1.BytesType || type instanceof solc_typed_ast_1.StringType);
        const elementT = (0, nodeTypeProcessing_1.getElementType)(type);
        const wideSize = (0, nodeTypeProcessing_1.getSize)(type);
        const size = wideSize !== undefined
            ? (0, utils_1.narrowBigIntSafe)(wideSize, `${(0, astPrinter_1.printNode)(node)} too long to process`)
            : elements.length;
        const name = this.getOrCreate(elementT, size, (0, nodeTypeProcessing_1.isDynamicArray)(type));
        const stub = (0, functionGeneration_1.createCairoFunctionStub)(name, (0, utils_1.mapRange)(size, (n) => [
            `e${n}`,
            (0, utils_1.typeNameFromTypeNode)(elementT, this.ast),
            (0, base_1.locationIfComplexType)(elementT, solc_typed_ast_1.DataLocation.Memory),
        ]), [['arr', (0, utils_1.typeNameFromTypeNode)(type, this.ast), solc_typed_ast_1.DataLocation.Memory]], ['range_check_ptr', 'warp_memory'], this.ast, node);
        return (0, functionGeneration_1.createCallToFunction)(stub, elements, this.ast);
    }
    getOrCreate(type, size, dynamic) {
        const elementCairoType = cairoTypeSystem_1.CairoType.fromSol(type, this.ast);
        const key = `${dynamic ? 'd' : 's'}${size}${elementCairoType.fullStringRepresentation}`;
        const existing = this.generatedFunctions.get(key);
        if (existing !== undefined) {
            return existing.name;
        }
        const funcName = `WM${this.generatedFunctions.size}_${dynamic ? 'd' : 's'}_arr`;
        const argString = (0, utils_1.mapRange)(size, (n) => `e${n}: ${elementCairoType.toString()}`).join(', ');
        // If it's dynamic we need to include the length at the start
        const alloc_len = dynamic ? size * elementCairoType.width + 2 : size * elementCairoType.width;
        this.generatedFunctions.set(key, {
            name: funcName,
            code: [
                `func ${funcName}{range_check_ptr, warp_memory: DictAccess*}(${argString}) -> (loc: felt):`,
                `    alloc_locals`,
                `    let (start) = wm_alloc(${(0, utils_2.uint256)(alloc_len)})`,
                [
                    ...(dynamic ? [`wm_write_256{warp_memory=warp_memory}(start, ${(0, utils_2.uint256)(size)})`] : []),
                    ...(0, utils_1.mapRange)(size, (n) => elementCairoType.serialiseMembers(`e${n}`))
                        .flat()
                        .map((name, index) => `dict_write{dict_ptr=warp_memory}(${(0, base_1.add)('start', dynamic ? index + 2 : index)}, ${name})`),
                ].join('\n'),
                `    return (start)`,
                `end`,
            ].join('\n'),
        });
        this.requireImport('warplib.memory', 'wm_alloc');
        this.requireImport('warplib.memory', 'wm_write_256');
        this.requireImport('starkware.cairo.common.uint256', 'Uint256');
        this.requireImport('starkware.cairo.common.dict', 'dict_write');
        return funcName;
    }
}
exports.MemoryArrayLiteralGen = MemoryArrayLiteralGen;
//# sourceMappingURL=arrayLiteral.js.map