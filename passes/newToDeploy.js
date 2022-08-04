"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NewToDeploy = void 0;
const solc_typed_ast_1 = require("solc-typed-ast");
const mapper_1 = require("../ast/mapper");
const solc_typed_ast_2 = require("solc-typed-ast");
const assert_1 = __importDefault(require("assert"));
const functionGeneration_1 = require("../utils/functionGeneration");
const nodeTemplates_1 = require("../utils/nodeTemplates");
const cloning_1 = require("../utils/cloning");
const postCairoWrite_1 = require("../utils/postCairoWrite");
const nameModifiers_1 = require("../utils/nameModifiers");
const astPrinter_1 = require("../utils/astPrinter");
const errors_1 = require("../utils/errors");
/** Pass that takes all expressions of the form:
 *
 *   `new {salt: salt} Contract(arg1, ..., argn)`
 *
 *   And transpiles them to Cairo `deploy` system call:
 *
 *   `deploy(contract_class_hash, salt, encode(arg1, ... argn), deploy_from_zero)`
 *
 *   -----
 *
 *   Since solidity stores the bytecode of the contract to create, and cairo uses
 *   a declaration address(`class_hash`) of the contract on starknet and the latter
 *   can only be known when interacting with starknet, empty placeholders are used
 *   for compiling, and then filled during deployement with the right address.
 *
 *   Salt in solidity is 32 bytes while in Cairo is a felt, so it'll be safely
 *   narrowed down. Notice that values bigger than a felt will result in errors
 *   such as "abc" which in bytes32 representation gets 0x636465...0000 which is
 *   bigger than a felt.
 *
 *   Encode is a util function generated which takes all the transpiled arguments
 *   and makes them a big dynamic arrays of felts. For example arguments:
 *   (a : Uint256, b : felt, c : (felt, felt, felt))
 *   are encoded as (6, [a.low, a.high, b, c[0], c[1], c[2]])
 *
 *   deploy_from_zero is a bool which determines if the deployer's address will
 *   affect the contract address or not. Is set to FALSE by default.
 *
 */
class NewToDeploy extends mapper_1.ASTMapper {
    constructor() {
        super(...arguments);
        // map of: (contract name => class hash placeholder)
        this.placeHolderMap = new Map();
    }
    addInitialPassPrerequisites() {
        const passKeys = new Set([
            'I',
            'Ffi', // Define the `encoder` util function after the free funtion has been moved
        ]);
        passKeys.forEach((key) => this.addPassPrerequisite(key));
    }
    visitNewExpression(node, ast) {
        if (!(node.vTypeName instanceof solc_typed_ast_2.UserDefinedTypeName &&
            node.vTypeName.vReferencedDeclaration instanceof solc_typed_ast_1.ContractDefinition)) {
            return;
        }
        const contractToCreate = node.vTypeName.vReferencedDeclaration;
        // Get or create placeholder for the class hash
        let placeholder = this.placeHolderMap.get(contractToCreate.name);
        if (placeholder === undefined) {
            const sourceUnit = node.getClosestParentByType(solc_typed_ast_1.SourceUnit);
            (0, assert_1.default)(sourceUnit !== undefined, `Couldn not find source unit of ${(0, astPrinter_1.printNode)(node)}`);
            placeholder = this.createPlaceHolder(sourceUnit, contractToCreate, ast);
            sourceUnit.insertAtBeginning(placeholder);
            ast.setContextRecursive(placeholder);
            // Insert placeholder declaration in mapping
            this.placeHolderMap.set(contractToCreate.name, placeholder);
        }
        // Swapping new for deploy sys call
        const parent = node.parent;
        let newFuncCall;
        let salt;
        if (parent instanceof solc_typed_ast_1.FunctionCall) {
            newFuncCall = parent;
            salt = (0, nodeTemplates_1.createNumberLiteral)(0, ast);
        }
        else if (parent instanceof solc_typed_ast_1.FunctionCallOptions) {
            (0, assert_1.default)(parent.parent instanceof solc_typed_ast_1.FunctionCall);
            newFuncCall = parent.parent;
            const bytes32Salt = parent.vOptionsMap.get('salt');
            (0, assert_1.default)(bytes32Salt !== undefined);
            // Narrow salt to a felt range
            const narrowStub = (0, functionGeneration_1.createCairoFunctionStub)('narrow_safe', [['x', (0, nodeTemplates_1.createBytesNTypeName)(32, ast)]], [['val', (0, nodeTemplates_1.createBytesNTypeName)(30, ast)]], ['range_check_ptr'], ast, parent);
            salt = (0, functionGeneration_1.createCallToFunction)(narrowStub, [bytes32Salt], ast, parent);
            ast.replaceNode(bytes32Salt, salt, parent);
            ast.registerImport(salt, 'warplib.maths.utils', 'narrow_safe');
        }
        else {
            throw new errors_1.TranspileFailedError(`Contract New Expression has an unexpected parent. Expected FunctionCall or FunctionCallOptions instead ${parent !== undefined ? (0, astPrinter_1.printNode)(parent) : 'undefined'} was found`);
        }
        const placeHolderIdentifier = (0, nodeTemplates_1.createIdentifier)(placeholder, ast);
        const deployCall = this.createDeploySysCall(newFuncCall, node.vTypeName, placeHolderIdentifier, salt, ast);
        ast.replaceNode(newFuncCall, deployCall);
        this.visitExpression(node, ast);
    }
    createDeploySysCall(node, typeName, placeHolderIdentifier, salt, ast) {
        const deployStub = (0, functionGeneration_1.createCairoFunctionStub)('deploy', [
            ['class_hash', (0, nodeTemplates_1.createAddressTypeName)(false, ast)],
            ['contract_address_salt', (0, nodeTemplates_1.createBytesNTypeName)(30, ast)],
            ['constructor_calldata', (0, nodeTemplates_1.createBytesTypeName)(ast), solc_typed_ast_1.DataLocation.CallData],
            ['deploy_from_zero', (0, nodeTemplates_1.createBoolTypeName)(ast)],
        ], [['contract_address', (0, cloning_1.cloneASTNode)(typeName, ast)]], ['syscall_ptr'], ast, node, { acceptsUnpackedStructArray: true });
        ast.registerImport(node, 'starkware.starknet.common.syscalls', 'deploy');
        const encodedArguments = ast.getUtilFuncGen(node).utils.encodeAsFelt.gen(node.vArguments);
        const deployFromZero = (0, nodeTemplates_1.createBoolLiteral)(false, ast);
        return (0, functionGeneration_1.createCallToFunction)(deployStub, [placeHolderIdentifier, salt, encodedArguments, deployFromZero], ast, node);
    }
    createPlaceHolder(sourceUnit, declaredContract, ast) {
        const declaredContractSourceUnit = declaredContract.getClosestParentByType(solc_typed_ast_1.SourceUnit);
        (0, assert_1.default)(declaredContractSourceUnit !== undefined);
        const declaredContractFullPath = declaredContractSourceUnit.absolutePath.split(new RegExp('/+|\\\\+'));
        const cairoPath = declaredContractSourceUnit.absolutePath
            .slice(0, -'.sol'.length)
            .concat('.cairo');
        const fileName = declaredContractFullPath[declaredContractFullPath.length - 1].split(nameModifiers_1.CONTRACT_INFIX)[0];
        const contractName = declaredContract.name;
        const fullPath = declaredContractFullPath.slice(0, -1).join('_');
        const varPrefix = `${fullPath}_${fileName}_${contractName}`;
        const hash = (0, postCairoWrite_1.hashFilename)(cairoPath);
        /*
         * The name of the place holder is important because it will be used later
         * during deployement to set the appopiate class hash value (notice below
         * it is being set to zero by default)
         * The name is a combination of:
         * - the path to the cairo file which contain the target contract to deploy
         * - the hash of the path.
         * The path part is unnecesary, but  it's left there for readability.
         * The hash part is the one used for later to search for the correct file
         * declaration. Also it used to avoid naming clashes between different placeholders.
         */
        const varName = `${varPrefix}_${hash}`;
        /*
         * The form of documenation is used later during postlinking to extract the files
         * this source unit depends on. See src/utils/postCairoWrite.ts
         */
        const documenation = `@declare ${cairoPath}`;
        const varDecl = new solc_typed_ast_1.VariableDeclaration(ast.reserveId(), '', true, false, varName, sourceUnit.id, false, solc_typed_ast_1.DataLocation.Default, solc_typed_ast_1.StateVariableVisibility.Internal, solc_typed_ast_1.Mutability.Constant, 'address', documenation, (0, nodeTemplates_1.createAddressTypeName)(false, ast), undefined, (0, nodeTemplates_1.createNumberLiteral)(0, ast, 'uint160'));
        return varDecl;
    }
}
exports.NewToDeploy = NewToDeploy;
//# sourceMappingURL=newToDeploy.js.map