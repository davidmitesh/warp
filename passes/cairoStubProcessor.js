"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CairoStubProcessor = void 0;
const solc_typed_ast_1 = require("solc-typed-ast");
const cairoNodes_1 = require("../ast/cairoNodes");
const mapper_1 = require("../ast/mapper");
const errors_1 = require("../utils/errors");
const utils_1 = require("../utils/utils");
class CairoStubProcessor extends mapper_1.ASTMapper {
    visitFunctionDefinition(node, _ast) {
        let documentation = getDocString(node.documentation);
        if (documentation === undefined)
            return;
        if (documentation.split('\n')[0]?.trim() !== 'warp-cairo')
            return;
        documentation = processDecoratorTags(documentation);
        documentation = processStateVarTags(documentation, node);
        documentation = processInternalFunctionTag(documentation, node);
        setDocString(node, documentation);
    }
}
exports.CairoStubProcessor = CairoStubProcessor;
function processDecoratorTags(documentation) {
    return processMacro(documentation, /DECORATOR\((.*?)\)/g, (s) => `@${s}`);
}
function processStateVarTags(documentation, node) {
    const contract = node.getClosestParentByType(cairoNodes_1.CairoContract);
    const errorNode = node.documentation instanceof solc_typed_ast_1.ASTNode ? node.documentation : node;
    if (contract === undefined) {
        throw new errors_1.WillNotSupportError(`Cairo stub macro 'STATEVAR' is only allowed in member functions`, errorNode);
    }
    return processMacro(documentation, /STATEVAR\((.*?)\)/g, (arg) => {
        const stateVarNames = contract.vStateVariables.map((decl) => decl.name);
        const matchingStateVars = stateVarNames.filter((name) => {
            return name.replace(/__warp_usrid[0-9]+_/, '') === arg;
        });
        if (matchingStateVars.length === 0) {
            throw new errors_1.TranspilationAbandonedError(`Unable to find matching statevar ${arg}`, errorNode);
        }
        else if (matchingStateVars.length === 1) {
            return matchingStateVars[0];
        }
        else {
            throw new errors_1.TranspileFailedError(`Unable to pick between multiple state vars matching ${arg}`, errorNode);
        }
    });
}
function processInternalFunctionTag(documentation, node) {
    const contract = node.getClosestParentByType(cairoNodes_1.CairoContract);
    const errorNode = node.documentation instanceof solc_typed_ast_1.ASTNode ? node.documentation : node;
    if (contract === undefined) {
        throw new errors_1.WillNotSupportError(`Cairo stub macro 'INTERNALFUNC' is only allowed in member function definitions`, errorNode);
    }
    return processMacro(documentation, /INTERNALFUNC\((.*?)\)/g, (arg) => {
        const funcNames = contract.vFunctions.filter((f) => !(0, utils_1.isExternallyVisible)(f)).map((f) => f.name);
        const matchingFuncs = funcNames.filter((name) => {
            return name.replace(/__warp_usrfn[0-9]+_/, '') === arg;
        });
        if (matchingFuncs.length === 0) {
            throw new errors_1.TranspilationAbandonedError(`Unable to find matching internal function ${arg}`, errorNode);
        }
        else if (matchingFuncs.length === 1) {
            return matchingFuncs[0];
        }
        else {
            throw new errors_1.TranspileFailedError(`Unable to pick between multiple internal functions matching ${arg}`, errorNode);
        }
    });
}
function processMacro(documentation, regex, func) {
    const macros = [...documentation.matchAll(regex)];
    return macros.reduce((docString, matchArr) => {
        const fullMacro = matchArr[0];
        const argument = matchArr[1];
        return docString.replace(fullMacro, func(argument));
    }, documentation);
}
function getDocString(doc) {
    if (doc === undefined)
        return undefined;
    if (typeof doc === 'string')
        return doc;
    return doc.text;
}
function setDocString(node, docString) {
    const existingDoc = node.documentation;
    if (existingDoc instanceof solc_typed_ast_1.StructuredDocumentation) {
        existingDoc.text = docString;
    }
    else {
        node.documentation = docString;
    }
}
//# sourceMappingURL=cairoStubProcessor.js.map