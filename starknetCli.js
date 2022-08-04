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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runStarknetDeclare = exports.runStarknetCallOrInvoke = exports.runStarknetDeployAccount = exports.runStarknetDeploy = exports.runStarknetStatus = exports.runStarknetCompile = exports.compileCairo = void 0;
const assert_1 = __importDefault(require("assert"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const passes_1 = require("./passes");
const errors_1 = require("./utils/errors");
const postCairoWrite_1 = require("./utils/postCairoWrite");
const warpVenvPrefix = `PATH=${path.resolve(__dirname, '..', 'warp_venv', 'bin')}:$PATH`;
function compileCairo(filePath, cairoPath = path.resolve(__dirname, '..')) {
    (0, assert_1.default)(filePath.endsWith('.cairo'), `Attempted to compile non-cairo file ${filePath} as cairo`);
    const cairoPathRoot = filePath.slice(0, -'.cairo'.length);
    const resultPath = `${cairoPathRoot}_compiled.json`;
    const abiPath = `${cairoPathRoot}_abi.json`;
    const parameters = new Map([
        ['output', resultPath],
        ['abi', abiPath],
    ]);
    if (cairoPath !== '') {
        parameters.set('cairo_path', cairoPath);
    }
    try {
        console.log(`Running starknet compile with cairoPath ${cairoPath}`);
        (0, child_process_1.execSync)(`${warpVenvPrefix} starknet-compile ${filePath} ${[...parameters.entries()]
            .map(([key, value]) => `--${key} ${value}`)
            .join(' ')}`, { stdio: 'inherit' });
        return { success: true, resultPath, abiPath, classHash: undefined };
    }
    catch (e) {
        if (e instanceof Error) {
            (0, errors_1.logError)('Compile failed');
            return { success: false, resultPath: undefined, abiPath: undefined, classHash: undefined };
        }
        else {
            throw e;
        }
    }
}
exports.compileCairo = compileCairo;
async function compileCairoDependencies(root, graph, filesCompiled) {
    const compiled = filesCompiled.get(root);
    if (compiled !== undefined) {
        return compiled;
    }
    const dependencies = graph.get(root);
    if (dependencies !== undefined) {
        for (const filesToDeclare of dependencies) {
            const result = await compileCairoDependencies(filesToDeclare, graph, filesCompiled);
            const fileLocationHash = (0, postCairoWrite_1.hashFilename)((0, postCairoWrite_1.reducePath)(filesToDeclare, 'warp_output'));
            filesCompiled.set(fileLocationHash, result);
        }
    }
    (0, postCairoWrite_1.setDeclaredAddresses)(root, new Map([...filesCompiled.entries()].map(([key, value]) => {
        (0, assert_1.default)(value.classHash !== undefined);
        return [key, value.classHash];
    })));
    const { success, resultPath, abiPath } = compileCairo(root, path.resolve(__dirname, '..'));
    if (!success) {
        throw new errors_1.CLIError(`Compilation of cairo file ${root} failed`);
    }
    const result = (0, child_process_1.execSync)(`${warpVenvPrefix} starknet declare --contract ${resultPath}`, {
        encoding: 'utf8',
    });
    const splitter = new RegExp('[ ]+');
    // Extract the hash from result
    const classHash = result
        .split('\n')
        .map((line) => {
        const [contractT, classT, hashT, hash, ...others] = line.split(splitter);
        if (contractT === 'Contract' && classT === 'class' && hashT === 'hash:') {
            if (others.length !== 0) {
                throw new errors_1.CLIError(`Error while parsing the 'declare' output of ${root}. Malformed lined.`);
            }
            return hash;
        }
        return null;
    })
        .filter((val) => val !== null)[0];
    if (classHash === null || classHash === undefined)
        throw new errors_1.CLIError(`Error while parsing the 'declare' output of ${root}. Couldn't find the class hash.`);
    return { success, resultPath, abiPath, classHash };
}
function runStarknetCompile(filePath) {
    const { success, resultPath } = compileCairo(filePath, path.resolve(__dirname, '..'));
    if (!success) {
        (0, errors_1.logError)(`Compilation of contract ${filePath} failed`);
        return;
    }
    console.log(`starknet-compile output written to ${resultPath}`);
}
exports.runStarknetCompile = runStarknetCompile;
function runStarknetStatus(tx_hash, option) {
    if (option.network == undefined) {
        (0, errors_1.logError)(`Error: Exception: feeder_gateway_url must be specified with the "status" subcommand.\nConsider passing --network or setting the STARKNET_NETWORK environment variable.`);
        return;
    }
    try {
        (0, child_process_1.execSync)(`${warpVenvPrefix} starknet tx_status --hash ${tx_hash} --network ${option.network}`, {
            stdio: 'inherit',
        });
    }
    catch {
        (0, errors_1.logError)('starknet tx_status failed');
    }
}
exports.runStarknetStatus = runStarknetStatus;
async function runStarknetDeploy(filePath, options) {
    if (options.network == undefined) {
        (0, errors_1.logError)(`Error: Exception: feeder_gateway_url must be specified with the "deploy" subcommand.\nConsider passing --network or setting the STARKNET_NETWORK environment variable.`);
        return;
    }
    // Shouldn't be fixed to warp_output (which is the default)
    // shuch option does not exists currently when deploying, should be added
    const dependencyGraph = (0, postCairoWrite_1.getDependencyGraph)(filePath, 'warp_output');
    let compileResult;
    try {
        compileResult = await compileCairoDependencies(filePath, dependencyGraph, new Map());
    }
    catch (e) {
        if (e instanceof errors_1.CLIError) {
            (0, errors_1.logError)(e.message);
        }
        throw e;
    }
    let inputs;
    try {
        inputs = (await (0, passes_1.encodeInputs)(filePath, 'constructor', options.use_cairo_abi, options.inputs))[1];
    }
    catch (e) {
        if (e instanceof errors_1.CLIError) {
            (0, errors_1.logError)(e.message);
            return;
        }
        throw e;
    }
    try {
        const resultPath = compileResult.resultPath;
        const classHash = compileResult.classHash;
        (0, child_process_1.execSync)(`${warpVenvPrefix} starknet deploy --network ${options.network} ${options.no_wallet ? `--no_wallet --contract ${resultPath} ` : `--class_hash ${classHash}`} ${inputs} ${options.account !== undefined ? `--account ${options.account}` : ''}`, {
            stdio: 'inherit',
        });
    }
    catch {
        (0, errors_1.logError)('starknet deploy failed');
    }
}
exports.runStarknetDeploy = runStarknetDeploy;
function runStarknetDeployAccount(options) {
    if (options.wallet == undefined) {
        (0, errors_1.logError)(`Error: AssertionError: --wallet must be specified with the "deploy_account" subcommand.`);
        return;
    }
    if (options.network == undefined) {
        (0, errors_1.logError)(`Error: Exception: feeder_gateway_url must be specified with the "deploy_account" subcommand.\nConsider passing --network or setting the STARKNET_NETWORK environment variable.`);
        return;
    }
    const account = options.account ? `--account ${options.account}` : '';
    try {
        (0, child_process_1.execSync)(`${warpVenvPrefix} starknet deploy_account --wallet ${options.wallet} --network ${options.network} ${account}`, {
            stdio: 'inherit',
        });
    }
    catch {
        (0, errors_1.logError)('starknet deploy failed');
    }
}
exports.runStarknetDeployAccount = runStarknetDeployAccount;
async function runStarknetCallOrInvoke(filePath, isCall, options) {
    const callOrInvoke = isCall ? 'call' : 'invoke';
    if (options.network == undefined) {
        (0, errors_1.logError)(`Error: Exception: feeder_gateway_url must be specified with the "${callOrInvoke}" subcommand.\nConsider passing --network or setting the STARKNET_NETWORK environment variable.`);
        return;
    }
    const wallet = options.wallet === undefined ? '--no_wallet' : `--wallet ${options.wallet}`;
    const account = options.account ? `--account ${options.account}` : '';
    const { success, abiPath } = compileCairo(filePath, path.resolve(__dirname, '..'));
    if (!success) {
        (0, errors_1.logError)(`Compilation of contract ${filePath} failed`);
        return;
    }
    let funcName, inputs;
    try {
        [funcName, inputs] = await (0, passes_1.encodeInputs)(filePath, options.function, options.use_cairo_abi, options.inputs);
    }
    catch (e) {
        if (e instanceof errors_1.CLIError) {
            (0, errors_1.logError)(e.message);
            return;
        }
        throw e;
    }
    try {
        (0, child_process_1.execSync)(`${warpVenvPrefix} starknet ${callOrInvoke}  --address ${options.address} --abi ${abiPath} --function ${funcName} --network ${options.network} ${wallet} ${account} ${inputs}`, { stdio: 'inherit' });
    }
    catch {
        (0, errors_1.logError)(`starknet ${callOrInvoke} failed`);
    }
}
exports.runStarknetCallOrInvoke = runStarknetCallOrInvoke;
function runStarknetDeclare(filePath) {
    const { success, resultPath } = compileCairo(filePath, path.resolve(__dirname, '..'));
    if (!success) {
        (0, errors_1.logError)(`Compilation of contract ${filePath} failed`);
        return;
    }
    try {
        (0, child_process_1.execSync)(`${warpVenvPrefix} starknet declare --contract ${resultPath}`);
    }
    catch (e) {
        (0, errors_1.logError)('starkned declared failed');
    }
}
exports.runStarknetDeclare = runStarknetDeclare;
//# sourceMappingURL=starknetCli.js.map