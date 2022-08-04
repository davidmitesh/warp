"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CairoASTMapping = exports.CairoASTNodeWriter = exports.INCLUDE_CAIRO_DUMP_FUNCTIONS = void 0;
const assert_1 = __importDefault(require("assert"));
const solc_typed_ast_1 = require("solc-typed-ast");
const abi_1 = require("solc-typed-ast/dist/types/abi");
const cairoNodes_1 = require("./ast/cairoNodes");
const freeStructWritter_1 = require("./freeStructWritter");
const astPrinter_1 = require("./utils/astPrinter");
const cairoTypeSystem_1 = require("./utils/cairoTypeSystem");
const errors_1 = require("./utils/errors");
const formatting_1 = require("./utils/formatting");
const implicits_1 = require("./utils/implicits");
const nodeTypeProcessing_1 = require("./utils/nodeTypeProcessing");
const typeConstructs_1 = require("./utils/typeConstructs");
const utils_1 = require("./utils/utils");
const INDENT = ' '.repeat(4);
exports.INCLUDE_CAIRO_DUMP_FUNCTIONS = false;
function getDocumentation(documentation, writer) {
    return documentation !== undefined
        ? typeof documentation === 'string'
            ? `# ${documentation.split('\n').join('\n#')}`
            : writer.write(documentation)
        : '';
}
class CairoASTNodeWriter extends solc_typed_ast_1.ASTNodeWriter {
    constructor(ast, throwOnUnimplemented) {
        super();
        this.ast = ast;
        this.throwOnUnimplemented = throwOnUnimplemented;
    }
    logNotImplemented(message) {
        if (this.throwOnUnimplemented) {
            throw new errors_1.NotSupportedYetError(message);
        }
        else {
            console.log(message);
        }
    }
}
exports.CairoASTNodeWriter = CairoASTNodeWriter;
class StructDefinitionWriter extends CairoASTNodeWriter {
    writeInner(node, writer) {
        return [
            [
                `struct ${(0, utils_1.mangleStructName)(node)}:`,
                ...node.vMembers
                    .map((value) => `member ${value.name} : ${cairoTypeSystem_1.CairoType.fromSol((0, solc_typed_ast_1.getNodeType)(value, writer.targetCompilerVersion), this.ast, cairoTypeSystem_1.TypeConversionContext.StorageAllocation)}`)
                    .map((v) => INDENT + v),
                `end`,
            ].join('\n'),
        ];
    }
}
class StructuredDocumentationWriter extends CairoASTNodeWriter {
    writeInner(node, _writer) {
        return [`# ${node.text.split('\n').join('\n#')}`];
    }
}
class VariableDeclarationWriter extends CairoASTNodeWriter {
    writeInner(node, writer) {
        const documentation = getDocumentation(node.documentation, writer);
        if ((node.stateVariable || node.parent instanceof solc_typed_ast_1.SourceUnit) && (0, utils_1.isCairoConstant)(node)) {
            (0, assert_1.default)(node.vValue !== undefined, 'Constant should have a defined value.');
            const constantValue = writer.write(node.vValue);
            return [[documentation, `const ${node.name} = ${constantValue}`].join('\n')];
        }
        return [node.name];
    }
}
class VariableDeclarationStatementWriter extends CairoASTNodeWriter {
    constructor() {
        super(...arguments);
        this.gapVarCounter = 0;
    }
    writeInner(node, writer) {
        (0, assert_1.default)(node.vInitialValue !== undefined, 'Variables should be initialised. Did you use VariableDeclarationInitialiser?');
        const documentation = getDocumentation(node.documentation, writer);
        const initialValueType = (0, solc_typed_ast_1.getNodeType)(node.vInitialValue, this.ast.compilerVersion);
        const getValueN = (n) => {
            if (initialValueType instanceof solc_typed_ast_1.TupleType) {
                return initialValueType.elements[n];
            }
            else if (n === 0)
                return initialValueType;
            throw new errors_1.TranspileFailedError(`Attempted to extract value at index ${n} of non-tuple return`);
        };
        const getDeclarationForId = (id) => {
            const declaration = node.vDeclarations.find((decl) => decl.id === id);
            (0, assert_1.default)(declaration !== undefined, `Unable to find variable declaration for assignment ${id}`);
            return declaration;
        };
        const declarations = node.assignments.flatMap((id, index) => {
            const type = (0, solc_typed_ast_1.generalizeType)(getValueN(index))[0];
            if ((0, nodeTypeProcessing_1.isDynamicArray)(type) &&
                node.vInitialValue instanceof solc_typed_ast_1.FunctionCall &&
                (0, utils_1.isExternalCall)(node.vInitialValue)) {
                if (id === null) {
                    const uniqueSuffix = this.gapVarCounter++;
                    return [`__warp_gv_len${uniqueSuffix}`, `__warp_gv${uniqueSuffix}`];
                }
                const declaration = getDeclarationForId(id);
                (0, assert_1.default)(declaration.storageLocation === solc_typed_ast_1.DataLocation.CallData, `WARNING: declaration receiving calldata dynarray has location ${declaration.storageLocation}`);
                const writtenVar = writer.write(declaration);
                return [`${writtenVar}_len`, writtenVar];
            }
            else {
                if (id === null) {
                    return [`__warp_gv${this.gapVarCounter++}`];
                }
                return [writer.write(getDeclarationForId(id))];
            }
        });
        if (node.vInitialValue instanceof solc_typed_ast_1.FunctionCall &&
            node.vInitialValue.vReferencedDeclaration instanceof cairoNodes_1.CairoFunctionDefinition &&
            node.vInitialValue.vReferencedDeclaration.functionStubKind === cairoNodes_1.FunctionStubKind.StructDefStub) {
            // This local statement is needed since Cairo is not supporting member access of structs with let.
            // The type hint also needs to be placed there since Cairo's default type hint is a felt.
            return [
                [
                    documentation,
                    `local ${declarations.join(', ')} : ${node.vInitialValue.vReferencedDeclaration.name} = ${writer.write(node.vInitialValue)}`,
                ].join('\n'),
            ];
        }
        else if (declarations.length > 1 || node.vInitialValue instanceof solc_typed_ast_1.FunctionCall) {
            return [
                [
                    documentation,
                    `let (${declarations.join(', ')}) = ${writer.write(node.vInitialValue)}`,
                ].join('\n'),
            ];
        }
        return [
            [documentation, `let ${declarations[0]} = ${writer.write(node.vInitialValue)}`].join('\n'),
        ];
    }
}
class IfStatementWriter extends CairoASTNodeWriter {
    writeInner(node, writer) {
        const documentation = getDocumentation(node.documentation, writer);
        return [
            [
                documentation,
                `if ${writer.write(node.vCondition)} != 0:`,
                writer.write(node.vTrueBody),
                ...(node.vFalseBody ? ['else:', writer.write(node.vFalseBody)] : []),
                'end',
            ]
                .filter(typeConstructs_1.notUndefined)
                .flat()
                .join('\n'),
        ];
    }
}
class TupleExpressionWriter extends CairoASTNodeWriter {
    writeInner(node, writer) {
        return [`(${node.vComponents.map((value) => writer.write(value)).join(', ')})`];
    }
}
function writeImports(imports) {
    if (exports.INCLUDE_CAIRO_DUMP_FUNCTIONS) {
        imports = (0, utils_1.mergeImports)(imports, new Map([['starkware.cairo.common.alloc', new Set(['alloc'])]]));
    }
    return [...imports.entries()]
        .map(([location, importedSymbols]) => `from ${location} import ${[...importedSymbols.keys()].join(', ')}`)
        .join('\n');
}
const interfaceNameMappings = new Map();
function generateInterfaceNameMappings(node) {
    const map = new Map();
    const existingNames = node.vContracts
        .filter((c) => c.kind !== solc_typed_ast_1.ContractKind.Interface)
        .map((c) => c.name);
    node.vContracts
        .filter((c) => c.kind === solc_typed_ast_1.ContractKind.Interface)
        .forEach((c) => {
        const baseName = c.name.replace('@interface', '');
        const interfaceName = `${baseName}_warped_interface`;
        if (!existingNames.includes(baseName)) {
            map.set(baseName, interfaceName);
        }
        else {
            let i = 1;
            while (existingNames.includes(`${interfaceName}_${i}`))
                ++i;
            map.set(baseName, `${interfaceName}_${i}`);
        }
    });
    interfaceNameMappings.set(node, map);
}
function getInterfaceNameForContract(contractName, nodeInSourceUnit) {
    const sourceUnit = nodeInSourceUnit instanceof solc_typed_ast_1.SourceUnit
        ? nodeInSourceUnit
        : nodeInSourceUnit.getClosestParentByType(solc_typed_ast_1.SourceUnit);
    (0, assert_1.default)(sourceUnit !== undefined, `Unable to find source unit for interface ${contractName} while writing`);
    const interfaceName = interfaceNameMappings.get(sourceUnit)?.get(contractName);
    (0, assert_1.default)(interfaceName !== undefined, `An error occured during name substitution for the interface ${contractName}`);
    return interfaceName;
}
let structRemappings;
class SourceUnitWriter extends CairoASTNodeWriter {
    writeInner(node, writer) {
        generateInterfaceNameMappings(node);
        // Every sourceUnit should only define a single contract
        const mainContract_ = node.vContracts.filter((cd) => cd.kind !== solc_typed_ast_1.ContractKind.Interface);
        (0, assert_1.default)(mainContract_.length <= 1, 'There should only be one active contract per sourceUnit');
        const [mainContract] = mainContract_;
        const [freeStructs, freeStructRemappings_] = mainContract
            ? (0, freeStructWritter_1.getStructsAndRemappings)(node, this.ast)
            : [[], new Map()];
        structRemappings = freeStructRemappings_;
        // Only constants generated by `newToDeploy` exist at this stage
        const constants = node.vVariables.flatMap((v) => {
            (0, assert_1.default)(v.vValue !== undefined, 'Constants cannot be unanssigned');
            return [`# ${v.documentation}`, `const ${v.name} = ${writer.write(v.vValue)}`].join('\n');
        });
        const structs = [...freeStructs, ...node.vStructs, ...(mainContract?.vStructs || [])].map((v) => writer.write(v));
        const functions = node.vFunctions.map((v) => writer.write(v));
        const contracts = node.vContracts.map((v) => writer.write(v));
        const generatedUtilFunctions = this.ast.getUtilFuncGen(node).getGeneratedCode();
        const imports = writeImports(this.ast.getImports(node));
        return [
            (0, formatting_1.removeExcessNewlines)([
                '%lang starknet',
                [imports],
                ...constants,
                ...structs,
                generatedUtilFunctions,
                ...functions,
                ...contracts,
            ].join('\n\n\n'), 3),
        ];
    }
}
function writeContractInterface(node, writer) {
    const documentation = getDocumentation(node.documentation, writer);
    const functions = node.vFunctions.map((v) => writer
        .write(v)
        .split('\n')
        .filter((line) => line.trim().startsWith('func '))
        .flatMap((line) => [line, 'end', ''])
        .map((l) => INDENT + l)
        .join('\n'));
    // Handle the workaround of genContractInterface function of externalContractInterfaceInserter.ts
    // Remove `@interface` to get the actual contract interface name
    const baseName = node.name.replace('@interface', '');
    const interfaceName = getInterfaceNameForContract(baseName, node);
    return [
        [
            documentation,
            [`@contract_interface`, `namespace ${interfaceName}:`, ...functions, `end`].join('\n'),
        ].join('\n'),
    ];
}
class CairoContractWriter extends CairoASTNodeWriter {
    writeInner(node, writer) {
        if (node.kind == solc_typed_ast_1.ContractKind.Interface) {
            return writeContractInterface(node, writer);
        }
        if (node.abstract)
            return [
                `# This contract may be abstract, it may not implement an abstract parent's methods\n# completely or it may not invoke an inherited contract's constructor correctly.\n`,
            ];
        const dynamicVariables = [...node.dynamicStorageAllocations.entries()].map(([decl, loc]) => `const ${decl.name} = ${loc}`);
        const staticVariables = [...node.staticStorageAllocations.entries()].map(([decl, loc]) => `const ${decl.name} = ${loc}`);
        const variables = [
            `# Dynamic variables - Arrays and Maps`,
            ...dynamicVariables,
            `# Static variables`,
            ...staticVariables,
        ];
        const documentation = getDocumentation(node.documentation, writer);
        // Don't need to write structs, SourceUnitWriter does so already
        const enums = node.vEnums.map((value) => writer.write(value));
        const functions = node.vFunctions.map((value) => writer.write(value));
        const events = node.vEvents.map((value) => writer.write(value));
        const body = [...variables, ...enums, ...functions]
            .join('\n\n')
            .split('\n')
            .map((l) => (l.length > 0 ? INDENT + l : l))
            .join('\n');
        const storageCode = [
            '@storage_var',
            'func WARP_STORAGE(index: felt) -> (val: felt):',
            'end',
            '@storage_var',
            'func WARP_USED_STORAGE() -> (val: felt):',
            'end',
            '@storage_var',
            'func WARP_NAMEGEN() -> (name: felt):',
            'end',
            'func readId{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr : felt}(loc: felt) -> (val: felt):',
            '    alloc_locals',
            '    let (id) = WARP_STORAGE.read(loc)',
            '    if id == 0:',
            '        let (id) = WARP_NAMEGEN.read()',
            '        WARP_NAMEGEN.write(id + 1)',
            '        WARP_STORAGE.write(loc, id + 1)',
            '        return (id + 1)',
            '    else:',
            '        return (id)',
            '    end',
            'end',
            ...(exports.INCLUDE_CAIRO_DUMP_FUNCTIONS
                ? [
                    'func DUMP_WARP_STORAGE_ITER{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(length : felt, ptr: felt*):',
                    '    alloc_locals',
                    '    if length == 0:',
                    '        return ()',
                    '    end',
                    '    let index = length - 1',
                    '    let (read) = WARP_STORAGE.read(index)',
                    '    assert ptr[index] = read',
                    '    DUMP_WARP_STORAGE_ITER(index, ptr)',
                    '    return ()',
                    'end',
                    '@external',
                    'func DUMP_WARP_STORAGE{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(length : felt) -> (data_len : felt, data: felt*):',
                    '    alloc_locals',
                    '    let (p: felt*) = alloc()',
                    '    DUMP_WARP_STORAGE_ITER(length, p)',
                    '    return (length, p)',
                    'end',
                ]
                : []),
        ].join('\n');
        return [
            [documentation, ...events, storageCode, `namespace ${node.name}:\n\n${body}\n\nend`].join('\n\n'),
        ];
    }
    writeWhole(node, writer) {
        return [`# Contract Def ${node.name}\n\n${this.writeInner(node, writer)}`];
    }
}
class NotImplementedWriter extends CairoASTNodeWriter {
    writeInner(node, _) {
        this.logNotImplemented(`${node.type} to cairo not implemented yet (found at ${(0, astPrinter_1.printNode)(node)})`);
        return [``];
    }
}
class ParameterListWriter extends CairoASTNodeWriter {
    writeInner(node, writer) {
        const defContext = node.parent instanceof solc_typed_ast_1.FunctionDefinition && (0, utils_1.isExternallyVisible)(node.parent)
            ? cairoTypeSystem_1.TypeConversionContext.CallDataRef
            : cairoTypeSystem_1.TypeConversionContext.Ref;
        const params = node.vParameters.map((value) => {
            const varTypeConversionContext = value.storageLocation === solc_typed_ast_1.DataLocation.CallData
                ? cairoTypeSystem_1.TypeConversionContext.CallDataRef
                : defContext;
            const tp = cairoTypeSystem_1.CairoType.fromSol((0, solc_typed_ast_1.getNodeType)(value, writer.targetCompilerVersion), this.ast, varTypeConversionContext);
            if (tp instanceof cairoTypeSystem_1.CairoDynArray && node.parent instanceof solc_typed_ast_1.FunctionDefinition) {
                return (0, utils_1.isExternallyVisible)(node.parent)
                    ? `${value.name}_len : ${tp.vLen.toString()}, ${value.name} : ${tp.vPtr.toString()}`
                    : `${value.name} : ${tp.toString()}`;
            }
            return `${value.name} : ${tp}`;
        });
        return [params.join(', ')];
    }
}
class CairoFunctionDefinitionWriter extends CairoASTNodeWriter {
    writeInner(node, writer) {
        if (node.functionStubKind !== cairoNodes_1.FunctionStubKind.None)
            return [''];
        const documentation = getDocumentation(node.documentation, writer);
        if (documentation.slice(1).trim().startsWith('warp-cairo')) {
            return [
                documentation
                    .split('\n')
                    .map((line) => line.slice(1))
                    .slice(1)
                    .join('\n'),
            ];
        }
        const name = this.getName(node);
        const decorator = this.getDecorator(node);
        const args = node.kind !== solc_typed_ast_1.FunctionKind.Fallback
            ? writer.write(node.vParameters)
            : 'selector : felt, calldata_size : felt, calldata : felt*';
        const body = this.getBody(node, writer);
        const returns = this.getReturns(node, writer);
        const implicits = this.getImplicits(node);
        return [
            [documentation, ...decorator, `func ${name}${implicits}(${args})${returns}:`, body, `end`]
                .filter(typeConstructs_1.notNull)
                .join('\n'),
        ];
    }
    getDecorator(node) {
        if (node.kind === solc_typed_ast_1.FunctionKind.Constructor)
            return ['@constructor'];
        const decorators = [];
        if (node.kind === solc_typed_ast_1.FunctionKind.Fallback) {
            decorators.push('@raw_input');
            if (node.vParameters.vParameters.length > 0)
                decorators.push('@raw_output');
        }
        if (node.visibility === solc_typed_ast_1.FunctionVisibility.External) {
            if ([solc_typed_ast_1.FunctionStateMutability.Pure, solc_typed_ast_1.FunctionStateMutability.View].includes(node.stateMutability))
                decorators.push('@view');
            else
                decorators.push('@external');
        }
        return decorators;
    }
    getName(node) {
        if (node.kind === solc_typed_ast_1.FunctionKind.Constructor)
            return 'constructor';
        if (node.kind === solc_typed_ast_1.FunctionKind.Fallback)
            return '__default__';
        return node.name;
    }
    getBody(node, writer) {
        if (node.vBody === undefined)
            return null;
        const [keccakPtrInit, [withKeccak, end]] = node.implicits.has('keccak_ptr') && (0, utils_1.isExternallyVisible)(node)
            ? [
                ['let (local keccak_ptr_start : felt*) = alloc()', 'let keccak_ptr = keccak_ptr_start'],
                ['with keccak_ptr:', 'end'],
            ]
            : [[], ['', '']];
        if (!(0, utils_1.isExternallyVisible)(node) || !node.implicits.has('warp_memory')) {
            return [
                'alloc_locals',
                this.getConstructorStorageAllocation(node),
                ...keccakPtrInit,
                withKeccak,
                writer.write(node.vBody),
                end,
            ]
                .filter(typeConstructs_1.notNull)
                .join('\n');
        }
        (0, assert_1.default)(node.vBody.children.length > 0, (0, formatting_1.error)(`${(0, astPrinter_1.printNode)(node)} has an empty body`));
        const keccakPtr = withKeccak !== '' ? ', keccak_ptr' : '';
        return [
            'alloc_locals',
            this.getConstructorStorageAllocation(node),
            ...keccakPtrInit,
            'let (local warp_memory : DictAccess*) = default_dict_new(0)',
            'local warp_memory_start: DictAccess* = warp_memory',
            'dict_write{dict_ptr=warp_memory}(0,1)',
            `with warp_memory${keccakPtr}:`,
            writer.write(node.vBody),
            'end',
        ]
            .flat()
            .filter(typeConstructs_1.notNull)
            .join('\n');
    }
    getReturns(node, writer) {
        if (node.kind === solc_typed_ast_1.FunctionKind.Constructor)
            return '';
        return `-> (${writer.write(node.vReturnParameters)})`;
    }
    getImplicits(node) {
        // Function in interfaces should not have implicit arguments written out
        if (node.vScope instanceof solc_typed_ast_1.ContractDefinition && node.vScope.kind === solc_typed_ast_1.ContractKind.Interface) {
            return '';
        }
        const implicits = [...node.implicits.values()].filter(
        // External functions should not print the warp_memory or keccak_ptr implicit argument, even
        // if they use them internally. Instead their contents are wrapped
        // in code to initialise them
        (i) => !(0, utils_1.isExternallyVisible)(node) || (i !== 'warp_memory' && i !== 'keccak_ptr'));
        if (implicits.length === 0)
            return '';
        return `{${implicits
            .sort(implicits_1.implicitOrdering)
            .map((implicit) => `${implicit} : ${implicits_1.implicitTypes[implicit]}`)
            .join(', ')}}`;
    }
    getConstructorStorageAllocation(node) {
        if (node.kind === solc_typed_ast_1.FunctionKind.Constructor) {
            const contract = node.vScope;
            (0, assert_1.default)(contract instanceof cairoNodes_1.CairoContract);
            if (contract.usedStorage === 0 && contract.usedIds === 0) {
                return null;
            }
            return [
                contract.usedStorage === 0 ? '' : `WARP_USED_STORAGE.write(${contract.usedStorage})`,
                contract.usedIds === 0 ? '' : `WARP_NAMEGEN.write(${contract.usedIds})`,
            ].join(`\n`);
        }
        return null;
    }
}
class BlockWriter extends CairoASTNodeWriter {
    writeInner(node, writer) {
        const documentation = getDocumentation(node.documentation, writer);
        return [
            [
                documentation,
                node.vStatements
                    .map((value) => writer.write(value))
                    .map((v) => v
                    .split('\n')
                    .map((line) => INDENT + line)
                    .join('\n'))
                    .join('\n'),
            ].join('\n'),
        ];
    }
}
class ReturnWriter extends CairoASTNodeWriter {
    writeInner(node, writer) {
        let returns = '()';
        const documentation = getDocumentation(node.documentation, writer);
        if (node.vExpression) {
            const expWriten = writer.write(node.vExpression);
            returns =
                node.vExpression instanceof solc_typed_ast_1.TupleExpression ||
                    (node.vExpression instanceof solc_typed_ast_1.FunctionCall &&
                        node.vExpression.kind !== solc_typed_ast_1.FunctionCallKind.StructConstructorCall)
                    ? expWriten
                    : `(${expWriten})`;
        }
        const finalizeWarpMemory = this.usesWarpMemory(node)
            ? 'default_dict_finalize(warp_memory_start, warp_memory, 0)\n'
            : '';
        const finalizeKeccakPtr = this.usesKeccak(node)
            ? 'finalize_keccak(keccak_ptr_start, keccak_ptr)\n'
            : '';
        return [[documentation, finalizeWarpMemory, finalizeKeccakPtr, `return ${returns}`].join('\n')];
    }
    usesWarpMemory(node) {
        const parentFunc = node.getClosestParentByType(cairoNodes_1.CairoFunctionDefinition);
        return (parentFunc instanceof cairoNodes_1.CairoFunctionDefinition &&
            parentFunc.implicits.has('warp_memory') &&
            (0, utils_1.isExternallyVisible)(parentFunc));
    }
    usesKeccak(node) {
        const parentFunc = node.getClosestParentByType(cairoNodes_1.CairoFunctionDefinition);
        return (parentFunc instanceof cairoNodes_1.CairoFunctionDefinition &&
            parentFunc.implicits.has('keccak_ptr') &&
            (0, utils_1.isExternallyVisible)(parentFunc));
    }
}
class ExpressionStatementWriter extends CairoASTNodeWriter {
    constructor() {
        super(...arguments);
        this.newVarCounter = 0;
    }
    writeInner(node, writer) {
        const documentation = getDocumentation(node.documentation, writer);
        if ((node.vExpression instanceof solc_typed_ast_1.FunctionCall &&
            node.vExpression.kind !== solc_typed_ast_1.FunctionCallKind.StructConstructorCall) ||
            node.vExpression instanceof solc_typed_ast_1.Assignment ||
            node.vExpression instanceof cairoNodes_1.CairoAssert) {
            return [[documentation, `${writer.write(node.vExpression)}`].join('\n')];
        }
        else {
            return [
                [
                    documentation,
                    `let __warp_uv${this.newVarCounter++} = ${writer.write(node.vExpression)}`,
                ].join('\n'),
            ];
        }
    }
}
class LiteralWriter extends CairoASTNodeWriter {
    writeInner(node, _) {
        switch (node.kind) {
            case solc_typed_ast_1.LiteralKind.Number:
                switch ((0, utils_1.primitiveTypeToCairo)(node.typeString)) {
                    case 'Uint256': {
                        const [high, low] = (0, utils_1.divmod)(BigInt(node.value), BigInt(Math.pow(2, 128)));
                        return [`Uint256(low=${low}, high=${high})`];
                    }
                    case 'felt':
                        return [node.value];
                    default:
                        throw new errors_1.TranspileFailedError('Attempted to write unexpected cairo type');
                }
            case solc_typed_ast_1.LiteralKind.Bool:
                return [node.value === 'true' ? '1' : '0'];
            case solc_typed_ast_1.LiteralKind.String:
            case solc_typed_ast_1.LiteralKind.UnicodeString: {
                if (node.value.length === node.hexValue.length / 2 &&
                    node.value.length < 32 &&
                    node.value.split('').every((v) => v.charCodeAt(0) < 127)) {
                    return [`'${node.value}'`];
                }
                return [`0x${node.hexValue}`];
            }
            case solc_typed_ast_1.LiteralKind.HexString:
                switch ((0, utils_1.primitiveTypeToCairo)(node.typeString)) {
                    case 'Uint256': {
                        return [
                            `Uint256(low=0x${node.hexValue.slice(32, 64)}, high=0x${node.hexValue.slice(0, 32)})`,
                        ];
                    }
                    case 'felt':
                        return [`0x${node.hexValue}`];
                    default:
                        throw new errors_1.TranspileFailedError('Attempted to write unexpected cairo type');
                }
        }
    }
}
class IndexAccessWriter extends CairoASTNodeWriter {
    writeInner(node, writer) {
        (0, assert_1.default)(node.vIndexExpression !== undefined);
        const baseWritten = writer.write(node.vBaseExpression);
        const indexWritten = writer.write(node.vIndexExpression);
        if ((0, nodeTypeProcessing_1.isDynamicCallDataArray)((0, solc_typed_ast_1.getNodeType)(node.vBaseExpression, this.ast.compilerVersion))) {
            return [`${baseWritten}.ptr[${indexWritten}]`];
        }
        return [`${baseWritten}[${indexWritten}]`];
    }
}
class IdentifierWriter extends CairoASTNodeWriter {
    writeInner(node, _) {
        if (node.vIdentifierType === solc_typed_ast_1.ExternalReferenceType.Builtin &&
            node.name === 'super' &&
            !(node.parent instanceof solc_typed_ast_1.MemberAccess)) {
            return ['0'];
        }
        if ((0, utils_1.isCalldataDynArrayStruct)(node, this.ast.compilerVersion)) {
            // Calldata dynamic arrays have the element pointer and length variables
            // stored inside a struct. When the dynamic array is accessed, struct's members
            // must be used instead
            return [`${node.name}.len, ${node.name}.ptr`];
        }
        if ((0, utils_1.isExternalMemoryDynArray)(node, this.ast.compilerVersion)) {
            // Memory treated as calldata behaves similarly to calldata but it's
            // element pointer and length variabes are not wrapped inside a struct.
            // When access to the dynamic array is needed, this two variables are used instead
            return [`${node.name}_len, ${node.name}`];
        }
        return [
            `${node.vReferencedDeclaration
                ? structRemappings.get(node.vReferencedDeclaration?.id) || node.name
                : node.name}`,
        ];
    }
}
class FunctionCallWriter extends CairoASTNodeWriter {
    writeInner(node, writer) {
        const args = node.vArguments.map((v) => writer.write(v)).join(', ');
        const func = writer.write(node.vExpression);
        switch (node.kind) {
            case solc_typed_ast_1.FunctionCallKind.FunctionCall: {
                if (node.vExpression instanceof solc_typed_ast_1.MemberAccess) {
                    // check if we're calling a member of a contract
                    const nodeType = (0, solc_typed_ast_1.getNodeType)(node.vExpression.vExpression, writer.targetCompilerVersion);
                    if (nodeType instanceof solc_typed_ast_1.UserDefinedType &&
                        nodeType.definition instanceof solc_typed_ast_1.ContractDefinition) {
                        const memberName = node.vExpression.memberName;
                        const contract = writer.write(node.vExpression.vExpression);
                        return [
                            `${getInterfaceNameForContract(nodeType.definition.name, node)}.${memberName}(${contract}${args ? ', ' : ''}${args})`,
                        ];
                    }
                }
                else if (node.vReferencedDeclaration instanceof cairoNodes_1.CairoFunctionDefinition &&
                    (node.vReferencedDeclaration.acceptsRawDarray ||
                        node.vReferencedDeclaration.acceptsUnpackedStructArray)) {
                    const [len_suffix, name_suffix] = node.vReferencedDeclaration.acceptsRawDarray
                        ? ['_len', '']
                        : ['.len', '.ptr'];
                    const argTypes = node.vArguments.map((v) => ({
                        name: writer.write(v),
                        type: (0, solc_typed_ast_1.getNodeType)(v, this.ast.compilerVersion),
                    }));
                    const args = argTypes
                        .map(({ name, type }) => (0, nodeTypeProcessing_1.isDynamicArray)(type) ? `${name}${len_suffix}, ${name}${name_suffix}` : name)
                        .join(',');
                    return [`${func}(${args})`];
                }
                return [`${func}(${args})`];
            }
            case solc_typed_ast_1.FunctionCallKind.StructConstructorCall:
                return [
                    `${node.vReferencedDeclaration && node.vReferencedDeclaration instanceof solc_typed_ast_1.StructDefinition
                        ? node.vReferencedDeclaration
                            ? (0, utils_1.mangleStructName)(node.vReferencedDeclaration)
                            : func
                        : func}(${args})`,
                ];
            case solc_typed_ast_1.FunctionCallKind.TypeConversion: {
                const arg = node.vArguments[0];
                if (node.vFunctionName === 'address' && arg instanceof solc_typed_ast_1.Literal) {
                    const val = BigInt(arg.value);
                    // Make sure literal < 2**251
                    (0, assert_1.default)(val < BigInt('0x800000000000000000000000000000000000000000000000000000000000000'));
                    return [`${args[0]}`];
                }
                const nodeType = (0, solc_typed_ast_1.getNodeType)(node.vExpression, writer.targetCompilerVersion);
                if (nodeType instanceof solc_typed_ast_1.UserDefinedType &&
                    nodeType.definition instanceof solc_typed_ast_1.ContractDefinition) {
                    return [`${args}`];
                }
                return [`${func}(${args})`];
            }
        }
    }
}
class UncheckedBlockWriter extends CairoASTNodeWriter {
    writeInner(node, writer) {
        const documentation = getDocumentation(node.documentation, writer);
        return [
            [
                documentation,
                node.vStatements
                    .map((value) => writer.write(value))
                    .map((v) => v
                    .split('\n')
                    .map((line) => INDENT + line)
                    .join('\n'))
                    .join('\n'),
            ].join('\n'),
        ];
    }
}
class MemberAccessWriter extends CairoASTNodeWriter {
    writeInner(node, writer) {
        return [`${writer.write(node.vExpression)}.${node.memberName}`];
    }
}
class BinaryOperationWriter extends CairoASTNodeWriter {
    writeInner(node, writer) {
        const args = [node.vLeftExpression, node.vRightExpression].map((v) => writer.write(v));
        return [`${args[0]} ${node.operator} ${args[1]}`];
    }
}
class AssignmentWriter extends CairoASTNodeWriter {
    writeInner(node, writer) {
        (0, assert_1.default)(node.operator === '=', `Unexpected operator ${node.operator}`);
        const [lhs, rhs] = [node.vLeftHandSide, node.vRightHandSide];
        const nodes = [lhs, rhs].map((v) => writer.write(v));
        // This is specifically needed because of the construtions involved with writing
        // conditionals (derived from short circuit expressions). Other tuple assignments
        // and function call assignments will have been split
        if (rhs instanceof solc_typed_ast_1.FunctionCall &&
            !(rhs.vReferencedDeclaration instanceof cairoNodes_1.CairoFunctionDefinition &&
                rhs.vReferencedDeclaration.functionStubKind === cairoNodes_1.FunctionStubKind.StructDefStub) &&
            !(lhs instanceof solc_typed_ast_1.TupleExpression)) {
            return [`let (${nodes[0]}) ${node.operator} ${nodes[1]}`];
        }
        return [`let ${nodes[0]} ${node.operator} ${nodes[1]}`];
    }
}
class EnumDefinitionWriter extends CairoASTNodeWriter {
    writeInner(_node, _writer) {
        // EnumDefinition nodes do not need to be printed because they would have been replaced by integer literals.
        return [``];
    }
}
class EventDefinitionWriter extends CairoASTNodeWriter {
    writeInner(node, writer) {
        const documentation = getDocumentation(node.documentation, writer);
        const args = writer.write(node.vParameters);
        return [
            [
                documentation,
                `@event`,
                `func ${node.name}_${node.canonicalSignatureHash(abi_1.ABIEncoderVersion.V2)}(${args}):`,
                `end`,
            ].join('\n'),
        ];
    }
}
class EmitStatementWriter extends CairoASTNodeWriter {
    writeInner(node, writer) {
        const eventDef = node.vEventCall.vReferencedDeclaration;
        (0, assert_1.default)(eventDef instanceof solc_typed_ast_1.EventDefinition, `Expected EventDefintion as referenced type`);
        const documentation = getDocumentation(node.documentation, writer);
        const args = node.vEventCall.vArguments.map((v) => writer.write(v)).join(', ');
        return [
            [
                documentation,
                `${node.vEventCall.vFunctionName}_${eventDef.canonicalSignatureHash(abi_1.ABIEncoderVersion.V2)}.emit(${args})`,
            ].join('\n'),
        ];
    }
}
class CairoAssertWriter extends CairoASTNodeWriter {
    writeInner(node, writer) {
        const assertExpr = `assert ${writer.write(node.vExpression)} = 1`;
        if (node.assertMessage === null) {
            return [assertExpr];
        }
        else {
            return [
                [`with_attr error_message("${node.assertMessage}"):`, `${INDENT}${assertExpr}`, `end`].join('\n'),
            ];
        }
    }
}
class ElementaryTypeNameExpressionWriter extends CairoASTNodeWriter {
    writeInner(_node, _writer) {
        //ElementaryTypeNameExpressions left in the tree by this point being unreferenced expressions, and that this needs to work with out ineffectual statement handling
        return ['0'];
    }
}
const CairoASTMapping = (ast, throwOnUnimplemented) => new Map([
    [solc_typed_ast_1.ArrayTypeName, new NotImplementedWriter(ast, throwOnUnimplemented)],
    [solc_typed_ast_1.Assignment, new AssignmentWriter(ast, throwOnUnimplemented)],
    [solc_typed_ast_1.BinaryOperation, new BinaryOperationWriter(ast, throwOnUnimplemented)],
    [solc_typed_ast_1.Block, new BlockWriter(ast, throwOnUnimplemented)],
    [solc_typed_ast_1.Break, new NotImplementedWriter(ast, throwOnUnimplemented)],
    [cairoNodes_1.CairoAssert, new CairoAssertWriter(ast, throwOnUnimplemented)],
    [cairoNodes_1.CairoContract, new CairoContractWriter(ast, throwOnUnimplemented)],
    [cairoNodes_1.CairoFunctionDefinition, new CairoFunctionDefinitionWriter(ast, throwOnUnimplemented)],
    [solc_typed_ast_1.Conditional, new NotImplementedWriter(ast, throwOnUnimplemented)],
    [solc_typed_ast_1.Continue, new NotImplementedWriter(ast, throwOnUnimplemented)],
    [solc_typed_ast_1.DoWhileStatement, new NotImplementedWriter(ast, throwOnUnimplemented)],
    [solc_typed_ast_1.ElementaryTypeName, new NotImplementedWriter(ast, throwOnUnimplemented)],
    [
        solc_typed_ast_1.ElementaryTypeNameExpression,
        new ElementaryTypeNameExpressionWriter(ast, throwOnUnimplemented),
    ],
    [solc_typed_ast_1.EmitStatement, new EmitStatementWriter(ast, throwOnUnimplemented)],
    [solc_typed_ast_1.EnumDefinition, new EnumDefinitionWriter(ast, throwOnUnimplemented)],
    [solc_typed_ast_1.EnumValue, new NotImplementedWriter(ast, throwOnUnimplemented)],
    [solc_typed_ast_1.ErrorDefinition, new NotImplementedWriter(ast, throwOnUnimplemented)],
    [solc_typed_ast_1.EventDefinition, new EventDefinitionWriter(ast, throwOnUnimplemented)],
    [solc_typed_ast_1.ExpressionStatement, new ExpressionStatementWriter(ast, throwOnUnimplemented)],
    [solc_typed_ast_1.ForStatement, new NotImplementedWriter(ast, throwOnUnimplemented)],
    [solc_typed_ast_1.FunctionCall, new FunctionCallWriter(ast, throwOnUnimplemented)],
    [solc_typed_ast_1.FunctionCallOptions, new NotImplementedWriter(ast, throwOnUnimplemented)],
    [solc_typed_ast_1.FunctionTypeName, new NotImplementedWriter(ast, throwOnUnimplemented)],
    [solc_typed_ast_1.Identifier, new IdentifierWriter(ast, throwOnUnimplemented)],
    [solc_typed_ast_1.IdentifierPath, new NotImplementedWriter(ast, throwOnUnimplemented)],
    [solc_typed_ast_1.IfStatement, new IfStatementWriter(ast, throwOnUnimplemented)],
    [solc_typed_ast_1.ImportDirective, new NotImplementedWriter(ast, throwOnUnimplemented)],
    [solc_typed_ast_1.IndexAccess, new IndexAccessWriter(ast, throwOnUnimplemented)],
    [solc_typed_ast_1.IndexRangeAccess, new NotImplementedWriter(ast, throwOnUnimplemented)],
    [solc_typed_ast_1.InheritanceSpecifier, new NotImplementedWriter(ast, throwOnUnimplemented)],
    [solc_typed_ast_1.InlineAssembly, new NotImplementedWriter(ast, throwOnUnimplemented)],
    [solc_typed_ast_1.Literal, new LiteralWriter(ast, throwOnUnimplemented)],
    [solc_typed_ast_1.Mapping, new NotImplementedWriter(ast, throwOnUnimplemented)],
    [solc_typed_ast_1.MemberAccess, new MemberAccessWriter(ast, throwOnUnimplemented)],
    [solc_typed_ast_1.ModifierDefinition, new NotImplementedWriter(ast, throwOnUnimplemented)],
    [solc_typed_ast_1.ModifierInvocation, new NotImplementedWriter(ast, throwOnUnimplemented)],
    [solc_typed_ast_1.NewExpression, new NotImplementedWriter(ast, throwOnUnimplemented)],
    [solc_typed_ast_1.OverrideSpecifier, new NotImplementedWriter(ast, throwOnUnimplemented)],
    [solc_typed_ast_1.ParameterList, new ParameterListWriter(ast, throwOnUnimplemented)],
    [solc_typed_ast_1.PlaceholderStatement, new NotImplementedWriter(ast, throwOnUnimplemented)],
    [solc_typed_ast_1.Return, new ReturnWriter(ast, throwOnUnimplemented)],
    [solc_typed_ast_1.RevertStatement, new NotImplementedWriter(ast, throwOnUnimplemented)],
    [solc_typed_ast_1.SourceUnit, new SourceUnitWriter(ast, throwOnUnimplemented)],
    [solc_typed_ast_1.StructDefinition, new StructDefinitionWriter(ast, throwOnUnimplemented)],
    [solc_typed_ast_1.StructuredDocumentation, new StructuredDocumentationWriter(ast, throwOnUnimplemented)],
    [solc_typed_ast_1.Throw, new NotImplementedWriter(ast, throwOnUnimplemented)],
    [solc_typed_ast_1.TryCatchClause, new NotImplementedWriter(ast, throwOnUnimplemented)],
    [solc_typed_ast_1.TryStatement, new NotImplementedWriter(ast, throwOnUnimplemented)],
    [solc_typed_ast_1.TupleExpression, new TupleExpressionWriter(ast, throwOnUnimplemented)],
    [solc_typed_ast_1.UnaryOperation, new NotImplementedWriter(ast, throwOnUnimplemented)],
    [solc_typed_ast_1.UncheckedBlock, new UncheckedBlockWriter(ast, throwOnUnimplemented)],
    [solc_typed_ast_1.UserDefinedTypeName, new NotImplementedWriter(ast, throwOnUnimplemented)],
    [solc_typed_ast_1.UsingForDirective, new NotImplementedWriter(ast, throwOnUnimplemented)],
    [solc_typed_ast_1.VariableDeclaration, new VariableDeclarationWriter(ast, throwOnUnimplemented)],
    [
        solc_typed_ast_1.VariableDeclarationStatement,
        new VariableDeclarationStatementWriter(ast, throwOnUnimplemented),
    ],
    [solc_typed_ast_1.WhileStatement, new NotImplementedWriter(ast, throwOnUnimplemented)],
]);
exports.CairoASTMapping = CairoASTMapping;
//# sourceMappingURL=cairoWriter.js.map