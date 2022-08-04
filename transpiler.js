"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleTranspilationError = exports.transform = exports.transpile = void 0;
const solc_typed_ast_1 = require("solc-typed-ast");
const cairoWriter_1 = require("./cairoWriter");
const passes_1 = require("./passes");
const solWriter_1 = require("./solWriter");
const astPrinter_1 = require("./utils/astPrinter");
const cliOptionParsing_1 = require("./utils/cliOptionParsing");
const errors_1 = require("./utils/errors");
const formatting_1 = require("./utils/formatting");
const utils_1 = require("./utils/utils");
function transpile(ast, options) {
    const cairoAST = applyPasses(ast, options);
    const writer = new solc_typed_ast_1.ASTWriter((0, cairoWriter_1.CairoASTMapping)(cairoAST, options.strict ?? false), new solc_typed_ast_1.PrettyFormatter(4, 0), ast.compilerVersion);
    return cairoAST.roots.map((sourceUnit) => [
        sourceUnit.absolutePath,
        writer.write(sourceUnit),
        (0, passes_1.dumpABI)(sourceUnit, cairoAST),
    ]);
}
exports.transpile = transpile;
function transform(ast, options) {
    const cairoAST = applyPasses(ast, options);
    const writer = new solc_typed_ast_1.ASTWriter((0, solWriter_1.CairoToSolASTWriterMapping)(!!options.stubs), new solc_typed_ast_1.PrettyFormatter(4, 0), ast.compilerVersion);
    return cairoAST.roots.map((sourceUnit) => [
        sourceUnit.absolutePath,
        (0, formatting_1.removeExcessNewlines)(writer.write(sourceUnit), 2),
        (0, passes_1.dumpABI)(sourceUnit, cairoAST),
    ]);
}
exports.transform = transform;
function applyPasses(ast, options) {
    const passes = (0, cliOptionParsing_1.createPassMap)([
        ['Tf', passes_1.TupleFixes],
        ['Tnr', passes_1.TypeNameRemover],
        ['Ru', passes_1.RejectUnsupportedFeatures],
        ['Fm', passes_1.FilePathMangler],
        ['Ss', passes_1.SourceUnitSplitter],
        ['Ct', passes_1.TypeStringsChecker],
        ['Ae', passes_1.ABIExtractor],
        ['Idi', passes_1.ImportDirectiveIdentifier],
        ['L', passes_1.LiteralExpressionEvaluator],
        ['Na', passes_1.NamedArgsRemover],
        ['Ufr', passes_1.UsingForResolver],
        ['Fd', passes_1.FunctionTypeStringMatcher],
        ['Gp', passes_1.PublicStateVarsGetterGenerator],
        ['Tic', passes_1.TypeInformationCalculator],
        ['Ch', passes_1.ConstantHandler],
        ['M', passes_1.IdentifierMangler],
        ['Sai', passes_1.StaticArrayIndexer],
        ['Udt', passes_1.UserDefinedTypesConverter],
        ['Req', passes_1.Require],
        ['Ffi', passes_1.FreeFunctionInliner],
        ['Rl', passes_1.ReferencedLibraries],
        ['Ons', passes_1.OrderNestedStructs],
        ['Ech', passes_1.ExternalContractHandler],
        ['Sa', passes_1.StorageAllocator],
        ['Ii', passes_1.InheritanceInliner],
        ['Mh', passes_1.ModifierHandler],
        ['Pfs', passes_1.PublicFunctionSplitter],
        ['Eam', passes_1.ExternalArgModifier],
        ['Lf', passes_1.LoopFunctionaliser],
        ['R', passes_1.ReturnInserter],
        ['Rv', passes_1.ReturnVariableInitializer],
        ['If', passes_1.IfFunctionaliser],
        ['T', passes_1.TupleAssignmentSplitter],
        ['U', passes_1.UnloadingAssignment],
        ['V', passes_1.VariableDeclarationInitialiser],
        ['Vs', passes_1.VariableDeclarationExpressionSplitter],
        ['I', passes_1.ImplicitConversionToExplicit],
        ['Ntd', passes_1.NewToDeploy],
        ['Dh', passes_1.DeleteHandler],
        ['Rf', passes_1.References],
        ['Abc', passes_1.ArgBoundChecker],
        ['Ec', passes_1.EnumConverter],
        ['B', passes_1.BuiltinHandler],
        ['Bc', passes_1.BytesConverter],
        ['Us', passes_1.UnreachableStatementPruner],
        ['Fp', passes_1.UnreachableFunctionPruner],
        ['E', passes_1.ExpressionSplitter],
        ['An', passes_1.AnnotateImplicits],
        ['Ci', passes_1.CairoUtilImporter],
        ['Dus', passes_1.DropUnusedSourceUnits],
        ['Cs', passes_1.CairoStubProcessor],
    ]);
    const passesInOrder = (0, cliOptionParsing_1.parsePassOrder)(options.order, options.until, options.warnings, options.dev, passes);
    astPrinter_1.DefaultASTPrinter.applyOptions(options);
    printPassName('Input', options);
    printAST(ast, options);
    const finalAst = passesInOrder.reduce((ast, mapper) => {
        printPassName(mapper.getPassName(), options);
        const newAst = mapper.map(ast);
        printAST(ast, options);
        checkAST(ast, options, mapper.getPassName());
        return newAst;
    }, ast);
    return finalAst;
}
function handleTranspilationError(e) {
    if (e instanceof solc_typed_ast_1.CompileFailedError) {
        (0, utils_1.printCompileErrors)(e);
        console.error('Cannot start transpilation');
    }
    else if (e instanceof errors_1.TranspilationAbandonedError) {
        console.error(`Transpilation abandoned ${e.message}`);
    }
    else {
        console.error('Unexpected error during transpilation');
        console.error(e);
        console.error('Transpilation failed');
    }
}
exports.handleTranspilationError = handleTranspilationError;
// Transpilation printing
function printPassName(name, options) {
    if (options.printTrees)
        console.log(`---${name}---`);
}
function printAST(ast, options) {
    if (options.printTrees) {
        ast.roots.map((root) => {
            console.log(astPrinter_1.DefaultASTPrinter.print(root));
            console.log();
        });
    }
}
function checkAST(ast, options, mostRecentPassName) {
    if (options.checkTrees || options.strict) {
        try {
            const success = (0, utils_1.runSanityCheck)(ast, options.checkTrees ?? false, mostRecentPassName);
            if (!success && options.strict) {
                throw new errors_1.TranspileFailedError(`AST failed internal consistency check. Most recently run pass: ${mostRecentPassName}`);
            }
        }
        catch (e) {
            console.error((0, formatting_1.error)(`AST failed internal consistency check. Most recently run pass: ${mostRecentPassName}`));
            throw e;
        }
    }
}
//# sourceMappingURL=transpiler.js.map