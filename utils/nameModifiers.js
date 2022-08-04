"use strict";
/*
  Stores all prefix/infix/suffix of solidity variables generated/modified by
  the transpiler.
  Every new generation should be added accordingly.
*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.COMPOUND_ASSIGNMENT_SUBEXPRESSION_PREFIX = exports.SPLIT_EXPRESSION_PREFIX = exports.SPLIT_VARIABLE_PREFIX = exports.TUPLE_VALUE_PREFIX = exports.WHILE_PREFIX = exports.RETURN_VALUE_PREFIX = exports.RETURN_FLAG_PREFIX = exports.INTERNAL_FUNCTION_SUFFIX = exports.IF_FUNCTIONALISER_INFIX = exports.CALLDATA_TO_MEMORY_FUNCTION_PARAMETER_PREFIX = exports.MANGLED_RETURN_PARAMETER = exports.MANGLED_PARAMETER = exports.CONSTANT_STRING_TO_MEMORY_PREFIX = exports.CALLDATA_TO_MEMORY_PREFIX = exports.MANGLED_LOCAL_VAR = exports.MANGLED_TYPE_NAME = exports.MANGLED_INTERNAL_USER_FUNCTION = exports.CONTRACT_INFIX = exports.FREE_FILE_SUFFIX = exports.TUPLE_FILLER_PREFIX = void 0;
// Used in TupleFiller in TupleFixes
exports.TUPLE_FILLER_PREFIX = '__warp_tf';
// Used in SourceUnitSplitter
exports.FREE_FILE_SUFFIX = '__WC_FREE';
exports.CONTRACT_INFIX = '__WC__';
// Used in IdentifierManglerPass
exports.MANGLED_INTERNAL_USER_FUNCTION = '__warp_usrfn';
exports.MANGLED_TYPE_NAME = '__warp_usrT';
exports.MANGLED_LOCAL_VAR = '__warp_usrid';
// Used in StaticArrayIndexer
exports.CALLDATA_TO_MEMORY_PREFIX = 'cd_to_wm_';
// Used in StorageAllocator
exports.CONSTANT_STRING_TO_MEMORY_PREFIX = 'memory_string';
// Used in ModifierHandler in FunctionModifierHandler
exports.MANGLED_PARAMETER = '__warp_parameter';
exports.MANGLED_RETURN_PARAMETER = '__warp_ret_paramter';
// Used in ExternalArgModifier in MemoryRefInputModifier
exports.CALLDATA_TO_MEMORY_FUNCTION_PARAMETER_PREFIX = 'cd_to_wm_param_';
// Used in IfFunctionaliser
exports.IF_FUNCTIONALISER_INFIX = '_if_part';
// Used in PublicFunctionSplitter in ExternalFunctionCreator
exports.INTERNAL_FUNCTION_SUFFIX = '_internal';
// Used in LoopFunctionaliser
//  - Used in ReturnToBreak
exports.RETURN_FLAG_PREFIX = '__warp_rf';
exports.RETURN_VALUE_PREFIX = '__warp_rv';
//  - Used in utils
exports.WHILE_PREFIX = '__warp_while';
// Used in TupleAssignmentSplitter
exports.TUPLE_VALUE_PREFIX = '__warp_tv_';
// Used in  VariableDeclarationExpressionSplitter
exports.SPLIT_VARIABLE_PREFIX = '__warp_td_';
// Used in Expression Splitter
exports.SPLIT_EXPRESSION_PREFIX = '__warp_se_';
// Used in UnloadingAssignment
exports.COMPOUND_ASSIGNMENT_SUBEXPRESSION_PREFIX = '__warp_cs_';
//# sourceMappingURL=nameModifiers.js.map