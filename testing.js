"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runTests = void 0;
const solc_typed_ast_1 = require("solc-typed-ast");
const io_1 = require("./io");
const solCompile_1 = require("./solCompile");
const starknetCli_1 = require("./starknetCli");
const transpiler_1 = require("./transpiler");
const errors_1 = require("./utils/errors");
const utils_1 = require("./utils/utils");
const fs = __importStar(require("fs"));
const fs_extra_1 = require("fs-extra");
const formatting_1 = require("./utils/formatting");
const filePathMangler_1 = require("./passes/filePathMangler");
const nameModifiers_1 = require("./utils/nameModifiers");
const ResultTypeOrder = [
    'Success',
    'CairoCompileFailed',
    'NotSupportedYet',
    'TranspilationFailed',
    'WillNotSupport',
    'SolCompileFailed',
];
const expectedResults = new Map([
    ['example_contracts/array_length', 'Success'],
    ['example_contracts/ERC20', 'Success'],
    ['example_contracts/ERC20_storage', 'Success'],
    ['example_contracts/address/8/160_not_allowed', 'SolCompileFailed'],
    ['example_contracts/address/8/256_address', 'Success'],
    ['example_contracts/address/8/max_prime', 'SolCompileFailed'],
    ['example_contracts/address/8/max_prime_explicit', 'Success'],
    ['example_contracts/address/8/padding', 'Success'],
    ['example_contracts/address/8/prime_field', 'Success'],
    ['example_contracts/address/7/160_not_allowed', 'SolCompileFailed'],
    ['example_contracts/address/7/256_address', 'Success'],
    ['example_contracts/address/7/max_prime', 'SolCompileFailed'],
    ['example_contracts/address/7/max_prime_explicit', 'Success'],
    ['example_contracts/address/7/padding', 'Success'],
    ['example_contracts/address/7/prime_field', 'Success'],
    ['example_contracts/boolOp_noSideEffects', 'Success'],
    ['example_contracts/boolOp_sideEffects', 'Success'],
    ['example_contracts/bytesXAccess', 'Success'],
    ['example_contracts/c2c', 'Success'],
    // Uses conditionals explicitly
    ['example_contracts/conditional', 'WillNotSupport'],
    ['example_contracts/contract_to_contract', 'Success'],
    ['example_contracts/calldatacopy', 'WillNotSupport'],
    ['example_contracts/calldataload', 'WillNotSupport'],
    ['example_contracts/calldatasize', 'WillNotSupport'],
    ['example_contracts/comments', 'Success'],
    ['example_contracts/constructors_dyn', 'Success'],
    ['example_contracts/constructors_nonDyn', 'Success'],
    ['example_contracts/dai', 'Success'],
    ['example_contracts/delete', 'SolCompileFailed'],
    ['example_contracts/enums', 'Success'],
    ['example_contracts/enums7', 'Success'],
    ['example_contracts/errorHandling/assert', 'Success'],
    ['example_contracts/errorHandling/require', 'Success'],
    ['example_contracts/errorHandling/revert', 'Success'],
    ['example_contracts/events', 'Success'],
    ['example_contracts/external_function', 'Success'],
    ['example_contracts/fallbackWithoutArgs', 'Success'],
    ['example_contracts/fallbackWithArgs', 'WillNotSupport'],
    // Cannot import with a - in the filename
    ['example_contracts/file-with-minus-sign-included', 'Success'],
    // Typestring for the internal function call doesn't contain a location so a read isn't generated
    ['example_contracts/freeFunction', 'Success'],
    ['example_contracts/freeStruct', 'Success'],
    ['example_contracts/function_with_nested_return', 'Success'],
    ['example_contracts/functionArgumentConversions', 'Success'],
    ['example_contracts/functionInputs/arrayTest/arrayArrayArray', 'Success'],
    ['example_contracts/functionInputs/arrayTest/arrayArrayBytes', 'WillNotSupport'],
    ['example_contracts/functionInputs/arrayTest/arrayArrayDynArray', 'WillNotSupport'],
    ['example_contracts/functionInputs/arrayTest/arrayArrayStruct', 'Success'],
    ['example_contracts/functionInputs/arrayTest/arrayDynArrayArray', 'WillNotSupport'],
    ['example_contracts/functionInputs/arrayTest/arrayDynArrayDynArray', 'WillNotSupport'],
    ['example_contracts/functionInputs/arrayTest/arrayDynArrayStruct', 'WillNotSupport'],
    ['example_contracts/functionInputs/arrayTest/arrayStructArray', 'Success'],
    ['example_contracts/functionInputs/arrayTest/arrayStructDynArray', 'WillNotSupport'],
    ['example_contracts/functionInputs/arrayTest/arrayStructStruct', 'Success'],
    ['example_contracts/functionInputs/dynArrayTest/dynArrayArrayArray', 'Success'],
    ['example_contracts/functionInputs/dynArrayTest/dynArrayArrayDynArray', 'WillNotSupport'],
    ['example_contracts/functionInputs/dynArrayTest/dynArrayArrayStruct', 'Success'],
    ['example_contracts/functionInputs/dynArrayTest/dynArrayDynArrayArray', 'WillNotSupport'],
    ['example_contracts/functionInputs/dynArrayTest/dynArrayDynArrayDynArray', 'WillNotSupport'],
    ['example_contracts/functionInputs/dynArrayTest/dynArrayDynArrayStruct', 'WillNotSupport'],
    ['example_contracts/functionInputs/dynArrayTest/dynArrayStructArray', 'Success'],
    ['example_contracts/functionInputs/dynArrayTest/dynArrayStructDynArray', 'WillNotSupport'],
    ['example_contracts/functionInputs/dynArrayTest/dynArrayStructStruct', 'Success'],
    ['example_contracts/functionInputs/structTest/structArrayArray', 'Success'],
    ['example_contracts/functionInputs/structTest/structArrayDynArray', 'WillNotSupport'],
    ['example_contracts/functionInputs/structTest/structArrayStruct', 'Success'],
    ['example_contracts/functionInputs/structTest/structDynArrayArray', 'WillNotSupport'],
    ['example_contracts/functionInputs/structTest/structDynArrayDynArray', 'WillNotSupport'],
    ['example_contracts/functionInputs/structTest/structDynArrayStruct', 'WillNotSupport'],
    ['example_contracts/functionInputs/structTest/structString', 'WillNotSupport'],
    ['example_contracts/functionInputs/structTest/structStructArray', 'Success'],
    ['example_contracts/functionInputs/structTest/structStructBytes', 'WillNotSupport'],
    ['example_contracts/functionInputs/structTest/structStructDynArray', 'WillNotSupport'],
    ['example_contracts/functionInputs/structTest/structStructStruct', 'Success'],
    ['example_contracts/idManglingTest8', 'Success'],
    ['example_contracts/idManglingTest9', 'Success'],
    ['example_contracts/if_flattening', 'Success'],
    ['example_contracts/imports/importContract', 'Success'],
    ['example_contracts/imports/importEnum', 'Success'],
    ['example_contracts/imports/importfrom', 'Success'],
    ['example_contracts/imports/importInterface', 'Success'],
    ['example_contracts/imports/importLibrary', 'Success'],
    ['example_contracts/imports/importStruct', 'Success'],
    ['example_contracts/index_param', 'WillNotSupport'],
    ['example_contracts/inheritance/simple', 'Success'],
    ['example_contracts/inheritance/super/base', 'Success'],
    ['example_contracts/inheritance/super/derived', 'Success'],
    ['example_contracts/inheritance/super/mid', 'Success'],
    ['example_contracts/inheritance/variables', 'Success'],
    // Requires struct imports
    ['example_contracts/interfaces', 'Success'],
    ['example_contracts/invalidSolidity', 'SolCompileFailed'],
    ['example_contracts/lib', 'Success'],
    ['example_contracts/libraries/using_for_star', 'Success'],
    ['example_contracts/literalOperations', 'Success'],
    ['example_contracts/loops/for_loop_with_break', 'Success'],
    ['example_contracts/loops/for_loop_with_continue', 'Success'],
    ['example_contracts/loops/for_loop_with_nested_return', 'Success'],
    ['example_contracts/rejectedTerms/contract_name$', 'WillNotSupport'],
    ['example_contracts/rejectedTerms/reservedContract', 'WillNotSupport'],
    ['example_contracts/rejectedTerms/contract_name_lib', 'WillNotSupport'],
    ['example_contracts/memberAccess/balance', 'WillNotSupport'],
    ['example_contracts/memberAccess/call', 'WillNotSupport'],
    ['example_contracts/memberAccess/code', 'WillNotSupport'],
    ['example_contracts/memberAccess/codehash', 'WillNotSupport'],
    ['example_contracts/memberAccess/delegatecall', 'WillNotSupport'],
    ['example_contracts/memberAccess/send', 'WillNotSupport'],
    ['example_contracts/memberAccess/staticcall', 'WillNotSupport'],
    ['example_contracts/memberAccess/transfer', 'WillNotSupport'],
    ['example_contracts/msg', 'WillNotSupport'],
    ['example_contracts/mutableReferences/deepDelete', 'Success'],
    ['example_contracts/mutableReferences/memory', 'Success'],
    ['example_contracts/mutableReferences/mutableReferences', 'Success'],
    ['example_contracts/mutableReferences/scalarStorage', 'Success'],
    ['example_contracts/namedArgs/constructor', 'Success'],
    ['example_contracts/namedArgs/events_and_errors', 'Success'],
    ['example_contracts/namedArgs/function', 'Success'],
    ['example_contracts/nested_static_array_struct', 'Success'],
    ['example_contracts/nested_struct_static_array', 'Success'],
    ['example_contracts/nested_structs', 'Success'],
    ['example_contracts/nested_tuple', 'WillNotSupport'],
    ['example_contracts/old_code_gen_err', 'WillNotSupport'],
    ['example_contracts/old_code_gen_err_7', 'WillNotSupport'],
    ['example_contracts/payable_function', 'Success'],
    ['example_contracts/pure_function', 'Success'],
    ['example_contracts/removeUnreachableFunctions', 'Success'],
    ['example_contracts/return_dyn_array', 'Success'],
    ['example_contracts/return_var_capturing', 'Success'],
    ['example_contracts/returndatasize', 'WillNotSupport'],
    ['example_contracts/returnInserter', 'Success'],
    ['example_contracts/simple_storage_var', 'Success'],
    ['example_contracts/sstore_sload', 'WillNotSupport'],
    ['example_contracts/state_variables/scalars', 'Success'],
    ['example_contracts/state_variables/enums', 'Success'],
    ['example_contracts/state_variables/arrays', 'Success'],
    ['example_contracts/state_variables/arrays_init', 'Success'],
    ['example_contracts/state_variables/mappings', 'Success'],
    ['example_contracts/state_variables/structs', 'Success'],
    ['example_contracts/state_variables/structs_nested', 'Success'],
    ['example_contracts/state_variables/misc', 'Success'],
    ['example_contracts/structs', 'Success'],
    ['example_contracts/this_methods_call', 'Success'],
    ['example_contracts/try_catch', 'WillNotSupport'],
    ['example_contracts/tupleAssignment7', 'Success'],
    ['example_contracts/tupleAssignment8', 'SolCompileFailed'],
    ['example_contracts/typeConversion/explicitTypeConversion', 'Success'],
    ['example_contracts/typeConversion/implicitReturnConversion', 'Success'],
    ['example_contracts/typeConversion/implicit_type_conv', 'Success'],
    ['example_contracts/typeConversion/shifts', 'Success'],
    ['example_contracts/typeConversion/unusedArrayConversion', 'Success'],
    ['example_contracts/typeMinMax', 'Success'],
    ['example_contracts/uint256_static_array_casting', 'Success'],
    ['example_contracts/typestrings/basicArrays', 'Success'],
    ['example_contracts/typestrings/scalars', 'Success'],
    ['example_contracts/typestrings/structArrays', 'Success'],
    ['example_contracts/typestrings/structs', 'Success'],
    ['example_contracts/units', 'Success'],
    ['example_contracts/unsupportedFunctions/abi', `WillNotSupport`],
    ['example_contracts/unsupportedFunctions/keccak256', `Success`],
    ['example_contracts/unsupportedFunctions/ecrecover', `Success`],
    ['example_contracts/unsupportedFunctions/addmod', `Success`],
    // Supported precompiles
    ['example_contracts/precompiles/ecrecover', 'Success'],
    ['example_contracts/precompiles/keccak256', 'Success'],
    // Uses bytes memory
    ['example_contracts/unsupportedFunctions/shadowAbi', `Success`],
    // Uses bytes memory
    ['example_contracts/unsupportedFunctions/shadowKeccak256', `Success`],
    ['example_contracts/unsupportedFunctions/shadowEcrecover', `Success`],
    // uses modulo (%)
    ['example_contracts/unsupportedFunctions/shadowAddmod', 'Success'],
    // Uses WARP_STORAGE in a free function
    ['example_contracts/using_for/imports/user_defined', 'Success'],
    // global_directive.sol cannot resolve struct when file imported as identifier
    ['example_contracts/using_for/imports/global_directive', 'Success'],
    ['example_contracts/using_for/function', 'WillNotSupport'],
    ['example_contracts/using_for/private', 'Success'],
    ['example_contracts/using_for/library', 'Success'],
    ['example_contracts/using_for/simple', 'Success'],
    ['example_contracts/usingReturnValues', 'Success'],
    ['example_contracts/userDefinedFunctionCalls', 'Success'],
    ['example_contracts/userdefinedtypes', 'Success'],
    ['example_contracts/userdefinedidentifier', 'Success'],
    ['example_contracts/variable_declarations', 'Success'],
    ['example_contracts/view_function', 'Success'],
    ['example_contracts/typestrings/enumArrays', 'Success'],
].map(([key, result]) => {
    return [(0, filePathMangler_1.manglePath)(key), result];
}));
function runTests(force, onlyResults, unsafe = false, exact = false) {
    const results = new Map();
    if (force) {
        postTestCleanup();
    }
    else if (!preTestChecks())
        return;
    (0, io_1.findSolSourceFilePaths)('example_contracts', true).forEach((file) => runSolFileTest(file, results, onlyResults, unsafe));
    (0, io_1.findCairoSourceFilePaths)('example__contracts', true).forEach((file) => {
        runCairoFileTest(file, results, onlyResults);
    });
    const testsWithUnexpectedResults = getTestsWithUnexpectedResults(results);
    printResults(results, testsWithUnexpectedResults);
    postTestCleanup();
    if (exact) {
        if (testsWithUnexpectedResults.length > 0) {
            throw new Error((0, formatting_1.error)(`${testsWithUnexpectedResults.length} test(s) had unexpected outcome(s)`));
        }
    }
}
exports.runTests = runTests;
function preTestChecks() {
    if (!checkNoCairo('example__contracts')) {
        console.log('Please remove example__contracts, or run with -f to delete it');
        return false;
    }
    if (!checkNoJson('example__contracts')) {
        console.log('Please remove example__contracts, or run with -f to delete it');
        return false;
    }
    if (!checkNoJson('warplib')) {
        console.log('Please remove all json files from warplib, or run with -f to delete them');
        return false;
    }
    return true;
}
function runSolFileTest(file, results, onlyResults, unsafe) {
    console.log(`Warping ${file}`);
    try {
        (0, transpiler_1.transpile)((0, solCompile_1.compileSolFile)(file, false), { strict: true }).forEach(([file, cairo]) => (0, fs_extra_1.outputFileSync)(`${file.slice(0, -4)}.cairo`, cairo));
        results.set((0, filePathMangler_1.manglePath)(removeExtension(file)), 'Success');
    }
    catch (e) {
        if (e instanceof solc_typed_ast_1.CompileFailedError) {
            if (!onlyResults)
                (0, utils_1.printCompileErrors)(e);
            results.set((0, filePathMangler_1.manglePath)(removeExtension(file)), 'SolCompileFailed');
        }
        else if (e instanceof errors_1.TranspilationAbandonedError) {
            if (e instanceof errors_1.NotSupportedYetError) {
                results.set((0, filePathMangler_1.manglePath)(removeExtension(file)), 'NotSupportedYet');
            }
            else if (e instanceof errors_1.WillNotSupportError) {
                results.set((0, filePathMangler_1.manglePath)(removeExtension(file)), 'WillNotSupport');
            }
            else {
                results.set((0, filePathMangler_1.manglePath)(removeExtension(file)), 'TranspilationFailed');
                if (unsafe)
                    throw e;
            }
            if (!onlyResults)
                console.log(`Transpilation abandoned ${e.message}`);
        }
        else {
            if (!onlyResults)
                console.log('Transpilation failed');
            if (!onlyResults)
                console.log(e);
            results.set((0, filePathMangler_1.manglePath)(removeExtension(file)), 'TranspilationFailed');
            if (unsafe)
                throw e;
        }
    }
}
function runCairoFileTest(file, results, onlyResults, throwError = false) {
    if (!onlyResults)
        console.log(`Compiling ${file}`);
    if ((0, starknetCli_1.compileCairo)(file).success) {
        results.set(removeExtension(file), 'Success');
    }
    else {
        if (throwError) {
            throw new Error((0, formatting_1.error)(`Compilation of ${file} failed`));
        }
        results.set(removeExtension(file), 'CairoCompileFailed');
    }
}
function combineResults(results) {
    return results.reduce((prev, current) => ResultTypeOrder.indexOf(prev) > ResultTypeOrder.indexOf(current) ? prev : current);
}
function getTestsWithUnexpectedResults(results) {
    const testsWithUnexpectedResults = [];
    const groupedResults = (0, utils_1.groupBy)([...results.entries()], ([file, _]) => {
        return file.split(nameModifiers_1.CONTRACT_INFIX)[0];
    });
    [...groupedResults.entries()].forEach((e) => {
        const expected = expectedResults.get(e[0]);
        const collectiveResult = combineResults([...e[1]].reduce((res, [_, result]) => [...res, result], []));
        if (collectiveResult !== expected) {
            testsWithUnexpectedResults.push(e[0]);
        }
    });
    return testsWithUnexpectedResults;
}
function printResults(results, unexpectedResults) {
    const totals = new Map();
    [...results.values()].forEach((r) => totals.set(r, (totals.get(r) ?? 0) + 1));
    console.log(`[${[...totals.entries()]
        .map(([result, count]) => `${result}: ${count}/${results.size}`)
        .join(', ')}]`);
    if (unexpectedResults.length === 0) {
        console.log(`CI passed. All outcomes are as expected.`);
    }
    else {
        console.log(`CI failed. ${unexpectedResults.length} test(s) had unexpected outcome(s).`);
        unexpectedResults.map((o) => {
            console.log(`\nTest: ${o}.sol`);
            console.log(`Expected outcome: ${expectedResults.get(o)}`);
            console.log(`Actual outcome:`);
            const Actual = new Map();
            results.forEach((value, key) => {
                if (key === o || key.startsWith(`${o}${nameModifiers_1.CONTRACT_INFIX}`)) {
                    Actual.set(key, value);
                }
            });
            Actual.forEach((value, key) => {
                if (key.includes(nameModifiers_1.CONTRACT_INFIX)) {
                    console.log(key + '.cairo' + ' : ' + value);
                }
                else {
                    console.log(key + '.sol' + ' : ' + value);
                }
            });
        });
        console.log('\n');
    }
}
function checkNoCairo(path) {
    return !fs.existsSync(path) || (0, io_1.findCairoSourceFilePaths)(path, true).length === 0;
}
function checkNoJson(path) {
    return (!fs.existsSync(path) ||
        (0, io_1.findAllFiles)(path, true).filter((file) => file.endsWith('.json')).length === 0);
}
function postTestCleanup() {
    deleteJson('warplib');
    fs.rmSync('example__contracts', { recursive: true, force: true });
}
function deleteJson(path) {
    (0, io_1.findAllFiles)(path, true)
        .filter((file) => file.endsWith('.json'))
        .forEach((file) => fs.unlinkSync(file));
}
function removeExtension(file) {
    const index = file.lastIndexOf('.');
    if (index === -1)
        return file;
    return file.slice(0, index);
}
//# sourceMappingURL=testing.js.map