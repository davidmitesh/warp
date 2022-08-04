"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requiredBuiltin = exports.registerImportsForImplicit = exports.implicitTypes = exports.implicitOrdering = void 0;
const implicitsOrder = {
    syscall_ptr: 0,
    pedersen_ptr: 1,
    range_check_ptr: 2,
    bitwise_ptr: 3,
    warp_memory: 4,
    keccak_ptr: 5,
};
function implicitOrdering(a, b) {
    return implicitsOrder[a] - implicitsOrder[b];
}
exports.implicitOrdering = implicitOrdering;
exports.implicitTypes = {
    bitwise_ptr: 'BitwiseBuiltin*',
    pedersen_ptr: 'HashBuiltin*',
    range_check_ptr: 'felt',
    syscall_ptr: 'felt*',
    warp_memory: 'DictAccess*',
    keccak_ptr: 'felt*',
};
function registerImportsForImplicit(ast, node, implicit) {
    switch (implicit) {
        case 'bitwise_ptr':
            ast.registerImport(node, 'starkware.cairo.common.cairo_builtins', 'BitwiseBuiltin');
            break;
        case 'pedersen_ptr':
            ast.registerImport(node, 'starkware.cairo.common.cairo_builtins', 'HashBuiltin');
            break;
        case 'warp_memory':
            ast.registerImport(node, 'starkware.cairo.common.dict_access', 'DictAccess');
            break;
    }
}
exports.registerImportsForImplicit = registerImportsForImplicit;
exports.requiredBuiltin = {
    bitwise_ptr: 'bitwise',
    pedersen_ptr: 'pedersen',
    range_check_ptr: 'range_check',
    syscall_ptr: null,
    warp_memory: null,
    keccak_ptr: null,
};
//# sourceMappingURL=implicits.js.map