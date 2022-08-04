"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const io_1 = require("./io");
const solCompile_1 = require("./solCompile");
const transpiler_1 = require("./transpiler");
const analyseSol_1 = require("./utils/analyseSol");
const starknetCli_1 = require("./starknetCli");
const chalk_1 = __importDefault(require("chalk"));
const setupVenv_1 = require("./utils/setupVenv");
const testing_1 = require("./testing");
const program = new commander_1.Command();
program
    .command('transpile <files...>')
    .option('--compile-cairo')
    .option('--no-compile-errors')
    .option('--check-trees')
    .option('--highlight <ids...>')
    .option('--order <passOrder>')
    .option('-o, --output-dir <path>', undefined, 'warp_output')
    .option('--print-trees')
    .option('--no-result')
    .option('--no-stubs')
    .option('--no-strict')
    // Stops transpilation after the specified pass
    .option('--until <pass>')
    .option('--no-warnings')
    .option('--dev') // for development mode
    .action((files, options) => {
    // We do the extra work here to make sure all the errors are printed out
    // for all files which are invalid.
    if (files.map((file) => (0, io_1.isValidSolFile)(file)).some((result) => !result))
        return;
    files.forEach((file) => {
        if (files.length > 1) {
            console.log(`Compiling ${file}`);
        }
        try {
            (0, transpiler_1.transpile)((0, solCompile_1.compileSolFile)(file, options.warnings), options).map(([name, cairo, abi]) => {
                (0, io_1.outputResult)(name, cairo, options, '.cairo', abi);
            });
        }
        catch (e) {
            (0, transpiler_1.handleTranspilationError)(e);
        }
    });
});
program
    .command('transform <file>')
    .option('--no-compile-errors')
    .option('--check-trees')
    .option('--highlight <ids...>')
    .option('--order <passOrder>')
    .option('-o, --output-dir <path>')
    .option('--print-trees')
    .option('--no-result')
    .option('--no-stubs')
    .option('--no-strict')
    .option('--until <pass>')
    .option('--no-warnings')
    .action((file, options) => {
    if (!(0, io_1.isValidSolFile)(file))
        return;
    try {
        (0, transpiler_1.transform)((0, solCompile_1.compileSolFile)(file, options.warnings), options).map(([name, solidity, _]) => {
            (0, io_1.outputResult)(name, solidity, options, '_warp.sol');
        });
    }
    catch (e) {
        (0, transpiler_1.handleTranspilationError)(e);
    }
});
program
    .command('test')
    .option('-f --force')
    .option('-r --results')
    .option('-u --unsafe')
    .option('-e --exact')
    .action((options) => (0, testing_1.runTests)(options.force ?? false, options.results ?? false, options.unsafe ?? false, options.exact ?? false));
program
    .command('analyse <file>')
    .option('--highlight <ids...>')
    .action((file, options) => (0, analyseSol_1.analyseSol)(file, options));
program
    .command('status <tx_hash>')
    .option('--network <network>', 'Starknet network URL.', process.env.STARKNET_NETWORK)
    .action((tx_hash, options) => {
    (0, starknetCli_1.runStarknetStatus)(tx_hash, options);
});
program
    .command('deploy <file>')
    .option('--inputs <inputs>', 'Arguments to be passed to constructor of the program as a comma seperated list of strings, ints and lists.', undefined)
    .option('--use_cairo_abi', 'Use the cairo abi instead of solidity for the inputs.', false)
    .option('--network <network>', 'Starknet network URL', process.env.STARKNET_NETWORK)
    .option('--no_wallet', 'Do not use a wallet for deployment.', false)
    .option('--account <account>', 'Account to use for deployment', undefined)
    .action((file, options) => {
    (0, starknetCli_1.runStarknetDeploy)(file, options);
});
program
    .command('deploy_account')
    .option('--account <account>', 'The name of the account. If not given, the default for the wallet will be used.')
    .option('--network <network>', 'Starknet network URL.', process.env.STARKNET_NETWORK)
    .option('--wallet <wallet>', 'The name of the wallet, including the python module and wallet class.', process.env.STARKNET_WALLET)
    .action((options) => {
    (0, starknetCli_1.runStarknetDeployAccount)(options);
});
program
    .command('invoke <file>')
    .requiredOption('--address <address>', 'Address of contract to invoke.')
    .requiredOption('--function <function>', 'Function to invoke.')
    .option('--inputs <inputs>', 'Input to function as a comma separated string, use square brackets to represent lists and structs. Numbers can be represented in decimal and hex.', undefined)
    .option('--use_cairo_abi', 'Use the cairo abi instead of solidity for the inputs.', false)
    .option('--account <account>', 'The name of the account. If not given, the default for the wallet will be used.')
    .option('--network <network>', 'Starknet network URL.', process.env.STARKNET_NETWORK)
    .option('--wallet <wallet>', 'The name of the wallet, including the python module and wallet class.', process.env.STARKNET_WALLET)
    .action(async (file, options) => {
    (0, starknetCli_1.runStarknetCallOrInvoke)(file, false, options);
});
program
    .command('call <file>')
    .requiredOption('--address <address>', 'Address of contract to call.')
    .requiredOption('--function <function>', 'Function to call.')
    .option('--inputs <inputs>', 'Input to function as a comma separated string, use square brackets to represent lists and structs. Numbers can be represented in decimal and hex.', undefined)
    .option('--use_cairo_abi', 'Use the cairo abi instead of solidity for the inputs.', false)
    .option('--account <account>', 'The name of the account. If not given, the default for the wallet will be used.')
    .option('--network <network>', 'Starknet network URL.', process.env.STARKNET_NETWORK)
    .option('--wallet <wallet>', 'The name of the wallet, including the python module and wallet class.', process.env.STARKNET_WALLET)
    .action(async (file, options) => {
    (0, starknetCli_1.runStarknetCallOrInvoke)(file, true, options);
});
program
    .command('install')
    .option('--python <python>', 'Path to python3.7 executable.', 'python3.7')
    .option('-v, --verbose')
    .action((options) => {
    (0, setupVenv_1.runVenvSetup)(options);
});
program.command('compile <file>').action((file) => {
    (0, starknetCli_1.runStarknetCompile)(file);
});
const blue = chalk_1.default.bold.blue;
const green = chalk_1.default.bold.green;
program.command('version').action(() => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pjson = require('../package.json');
    console.log(blue(`Warp Version `) + green(pjson.version));
});
program.parse(process.argv);
//# sourceMappingURL=index.js.map