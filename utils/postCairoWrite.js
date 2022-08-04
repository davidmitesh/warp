"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.reducePath = exports.hashFilename = exports.getDependencyGraph = exports.setDeclaredAddresses = exports.HASH_OPTION = exports.HASH_SIZE = void 0;
const assert_1 = __importDefault(require("assert"));
const crypto_1 = require("crypto");
const fs_1 = require("fs");
const path_1 = require("path");
exports.HASH_SIZE = 16;
exports.HASH_OPTION = 'sha256';
/**
 *  Read a cairo file and for each constant of the form `const name = value`
 *  if `name` is of the form   `<contractName>_<contractNameHash>` then it corresponds
 *  to a placeholder waiting to be filled with the corresponding contract class hash
 *  @param fileLoc location of cairo file
 *  @param declarationAddresses mapping of: (placeholder hash) => (starknet class hash)
 */
function setDeclaredAddresses(fileLoc, declarationAddresses) {
    const plainCairoCode = (0, fs_1.readFileSync)(fileLoc, 'utf8');
    const cairoCode = plainCairoCode.split('\n');
    let update = false;
    const newCairoCode = cairoCode.map((codeLine) => {
        const [constant, fullName, equal, ...other] = codeLine.split(new RegExp('[ ]+'));
        if (constant !== 'const')
            return codeLine;
        (0, assert_1.default)(other.length === 1, `Parsing failure, unexpected extra tokens: ${other.join(' ')}`);
        const name = fullName.slice(0, -exports.HASH_SIZE - 1);
        const hash = fullName.slice(-exports.HASH_SIZE);
        const declaredAddress = declarationAddresses.get(hash);
        (0, assert_1.default)(declaredAddress !== undefined, `Cannot find declared address for ${name} with hash ${hash}`);
        // Flag that there are changes that need to be rewritten
        update = true;
        const newLine = [constant, fullName, equal, declaredAddress].join(' ');
        return newLine;
    });
    if (!update)
        return;
    const plainNewCairoCode = newCairoCode.join('\n');
    (0, fs_1.writeFileSync)(fileLoc, plainNewCairoCode);
}
exports.setDeclaredAddresses = setDeclaredAddresses;
/**
 * Produce a dependency graph among Cairo files. Due to cairo rules this graph is
 * more specifically a Directed Acyclic Graph (DAG)
 * A file A is said to be dependant from a file B if file A needs the class hash
 * of file B.
 * @param root file to explore for dependencies
 * @param pathPrefix filepath may be different during transpilation and after transpilation. This parameter is appended at the beggining to make them equal
 * @returns a map from string to list of strings, where the key is a file and the value are all the dependencies
 */
function getDependencyGraph(root, pathPrefix) {
    const filesToDeclare = extractContractsToDeclared(root, pathPrefix);
    const graph = new Map([[root, filesToDeclare]]);
    const pending = [...filesToDeclare];
    let count = 0;
    while (count < pending.length) {
        const fileSource = pending[count];
        if (graph.has(fileSource)) {
            count++;
            continue;
        }
        const newFilesToDeclare = extractContractsToDeclared(fileSource, pathPrefix);
        graph.set(fileSource, newFilesToDeclare);
        pending.push(...newFilesToDeclare);
        count++;
    }
    return graph;
}
exports.getDependencyGraph = getDependencyGraph;
/**
 * Read a cairo file and parse all instructions of the form:
 * \@declare `location`. All `location` are gathered and then returned
 * @param fileLoc cairo file path to read
 * @param pathPrefix filepath may be different during transpilation and after transpilation. This parameter is appended at the beggining to make them equal
 * @returns list of locations
 */
function extractContractsToDeclared(fileLoc, pathPrefix) {
    const plainCairoCode = (0, fs_1.readFileSync)(fileLoc, 'utf8');
    const cairoCode = plainCairoCode.split('\n');
    const contractsToDeclare = cairoCode
        .map((line) => {
        const [comment, declare, location, ...other] = line.split(new RegExp('[ ]+'));
        if (comment !== '#' || declare !== '@declare')
            return '';
        (0, assert_1.default)(other.length === 0, `Parsing failure, unexpected extra tokens: ${other.join(' ')}`);
        return (0, path_1.join)(pathPrefix, location);
    })
        .filter((val) => val !== '');
    return contractsToDeclare;
}
/**
 * Hash function used during transpilation and postlinking so same hash
 * given same input is produced during both phases
 * @param filename filesystem path
 * @returns hashed value
 */
function hashFilename(filename) {
    return (0, crypto_1.createHash)(exports.HASH_OPTION).update(filename).digest('hex').slice(0, exports.HASH_SIZE);
}
exports.hashFilename = hashFilename;
/**
 * Utility function to remove a prefix from a path
 *
 * Example:
 * full path = A/B/C/D
 * ignore path = A/B
 * reduced path = C/D
 * @param fullPath path to reduce
 * @param ignorePath prefix to remove
 * @returns reduced path
 */
function reducePath(fullPath, ignorePath) {
    const pathSplitter = new RegExp('/+|\\\\+');
    const ignore = ignorePath.split(pathSplitter);
    const full = fullPath.split(pathSplitter);
    (0, assert_1.default)(ignore.length < full.length, `Path to ignore should be lesser than actual path. Ignore path size is ${ignore.length} and actual path size is ${full.length}`);
    let ignoreTill = 0;
    for (const i in ignore) {
        if (ignore[i] !== full[i])
            break;
        ignoreTill += 1;
    }
    return (0, path_1.join)(...full.slice(ignoreTill));
}
exports.reducePath = reducePath;
//# sourceMappingURL=postCairoWrite.js.map