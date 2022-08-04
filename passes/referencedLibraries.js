"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReferencedLibraries = void 0;
const assert_1 = __importDefault(require("assert"));
const solc_typed_ast_1 = require("solc-typed-ast");
const mapper_1 = require("../ast/mapper");
// Library calls in solidity are delegate calls
// i.e  libraries can be seen as implicit base contracts of the contracts that use them
// The pass converts external call to a library to an internal call to it
// by adding the referenced Libraries in the `FunctionCall` to the
// linearizedBaselist of a contract/Library.
class ReferencedLibraries extends mapper_1.ASTMapper {
    // Function to add passes that should have been run before this pass
    addInitialPassPrerequisites() {
        const passKeys = new Set([]);
        passKeys.forEach((key) => this.addPassPrerequisite(key));
    }
    visitFunctionCall(node, ast) {
        const librariesById = new Map();
        if (node.vExpression instanceof solc_typed_ast_1.MemberAccess) {
            //Collect all library nodes and their ids in the map 'contractDef'
            ast.context.map.forEach((astNode, id) => {
                if (astNode instanceof solc_typed_ast_1.ContractDefinition && astNode.kind === solc_typed_ast_1.ContractKind.Library) {
                    librariesById.set(id, astNode);
                }
            });
            const calledDeclaration = node.vReferencedDeclaration;
            if (calledDeclaration === undefined) {
                return this.visitExpression(node, ast);
            }
            //Checks if the Function is a referenced Library functions,
            //if yes add it to the linearizedBaseContract list of parent ContractDefinition node
            //free functions calling library functions are not yet supported
            librariesById.forEach((library, _) => {
                if (library.vFunctions.some((libraryFunc) => libraryFunc.id === calledDeclaration.id)) {
                    const parent = node.getClosestParentByType(solc_typed_ast_1.ContractDefinition);
                    if (parent === undefined)
                        return;
                    getLibrariesToInherit(library, librariesById).forEach((id) => {
                        if (!parent.linearizedBaseContracts.includes(id)) {
                            parent.linearizedBaseContracts.push(id);
                        }
                    });
                }
            });
        }
        this.commonVisit(node, ast);
    }
}
exports.ReferencedLibraries = ReferencedLibraries;
function getLibrariesToInherit(calledLibrary, librariesById) {
    const ids = [calledLibrary.id];
    calledLibrary
        .getChildren()
        .filter((child) => child instanceof solc_typed_ast_1.FunctionCall && child.vExpression instanceof solc_typed_ast_1.MemberAccess)
        .forEach((functionCallInCalledLibrary) => {
        if (functionCallInCalledLibrary instanceof solc_typed_ast_1.FunctionCall) {
            librariesById.forEach((library, libraryId) => {
                (0, assert_1.default)(functionCallInCalledLibrary.vExpression instanceof solc_typed_ast_1.MemberAccess);
                const calledFuncId = functionCallInCalledLibrary.vExpression.referencedDeclaration;
                if (library.getChildren().some((node) => node.id === calledFuncId)) {
                    ids.push(libraryId);
                }
            });
        }
    });
    return ids;
}
//# sourceMappingURL=referencedLibraries.js.map