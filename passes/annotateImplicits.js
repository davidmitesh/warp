"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnnotateImplicits = void 0;
const assert_1 = __importDefault(require("assert"));
const solc_typed_ast_1 = require("solc-typed-ast");
const cairoNodes_1 = require("../ast/cairoNodes");
const mapper_1 = require("../ast/mapper");
const visitor_1 = require("../ast/visitor");
const astPrinter_1 = require("../utils/astPrinter");
const implicits_1 = require("../utils/implicits");
const utils_1 = require("../utils/utils");
class AnnotateImplicits extends mapper_1.ASTMapper {
    // Function to add passes that should have been run before this pass
    addInitialPassPrerequisites() {
        const passKeys = new Set([]);
        passKeys.forEach((key) => this.addPassPrerequisite(key));
    }
    visitCairoFunctionDefinition(node, ast) {
        this.commonVisit(node, ast);
    }
    visitFunctionDefinition(node, ast) {
        const implicits = new ImplicitCollector(node).collect(ast);
        const annotatedFunction = new cairoNodes_1.CairoFunctionDefinition(node.id, node.src, node.scope, node.kind, node.name, node.virtual, node.visibility, node.stateMutability, node.isConstructor, node.vParameters, node.vReturnParameters, node.vModifiers, implicits, cairoNodes_1.FunctionStubKind.None, false, false, node.vOverrideSpecifier, node.vBody, node.documentation, node.nameLocation, node.raw);
        ast.replaceNode(node, annotatedFunction);
        ast.copyRegisteredImports(node, annotatedFunction);
        implicits.forEach((i) => (0, implicits_1.registerImportsForImplicit)(ast, annotatedFunction, i));
        node.children.forEach((child) => this.dispatchVisit(child, ast));
    }
}
exports.AnnotateImplicits = AnnotateImplicits;
class ImplicitCollector extends visitor_1.ASTVisitor {
    constructor(root) {
        super();
        this.visited = new Set();
        this.root = root;
    }
    commonVisit(node, ast) {
        (0, assert_1.default)(!this.visited.has(node), `Implicit collected visited ${(0, astPrinter_1.printNode)(node)} twice`);
        this.visited.add(node);
        return node.children
            .map((child) => this.dispatchVisit(child, ast))
            .reduce((acc, set) => {
            set.forEach((implicit) => acc.add(implicit));
            return acc;
        }, new Set());
    }
    collect(ast) {
        // To avoid cycles, visitFunctionDefinition does not recurse when visiting root,
        // however it is needed for if root is a public function
        return (0, utils_1.union)(this.visitFunctionDefinition(this.root, ast), this.commonVisit(this.root, ast));
    }
    visitCairoFunctionDefinition(node, _ast) {
        this.visited.add(node);
        return node.implicits;
    }
    visitFunctionDefinition(node, ast) {
        const result = new Set();
        if (node.implemented && (0, utils_1.isExternallyVisible)(node)) {
            result.add('range_check_ptr');
            result.add('syscall_ptr');
        }
        if (node.isConstructor) {
            result.add('syscall_ptr');
            result.add('pedersen_ptr');
            result.add('range_check_ptr');
        }
        if (node === this.root)
            return result;
        return (0, utils_1.union)(result, this.commonVisit(node, ast));
    }
    visitFunctionCall(node, ast) {
        const result = this.commonVisit(node, ast);
        if (node.vReferencedDeclaration !== this.root &&
            (node.vReferencedDeclaration instanceof solc_typed_ast_1.FunctionDefinition ||
                node.vReferencedDeclaration instanceof solc_typed_ast_1.EventDefinition) &&
            !this.visited.has(node.vReferencedDeclaration)) {
            this.dispatchVisit(node.vReferencedDeclaration, ast).forEach((defn) => result.add(defn));
        }
        const sourceUnit = node.getClosestParentByType(solc_typed_ast_1.SourceUnit);
        const referencedSourceUnit = node.vReferencedDeclaration?.getClosestParentByType(solc_typed_ast_1.SourceUnit);
        if (referencedSourceUnit !== sourceUnit) {
            result.add('range_check_ptr');
            result.add('syscall_ptr');
        }
        return result;
    }
    visitEventDefinition(node, ast) {
        const result = this.commonVisit(node, ast);
        result.add('syscall_ptr');
        result.add('range_check_ptr');
        return result;
    }
}
//# sourceMappingURL=annotateImplicits.js.map