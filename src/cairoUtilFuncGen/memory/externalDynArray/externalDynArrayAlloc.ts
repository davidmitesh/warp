import {
  VariableDeclaration,
  FunctionCall,
  FunctionDefinition,
  ArrayTypeName,
  typeNameToTypeNode,
  DataLocation,
  Identifier,
} from 'solc-typed-ast';
import assert from 'assert';
import { createCairoFunctionStub, createCallToFunction } from '../../../utils/functionGeneration';

import { CairoType, TypeConversionContext } from '../../../utils/cairoTypeSystem';
import { StringIndexedFuncGen } from '../../base';
import { uint256 } from '../../../warplib/utils';
import { createIdentifier } from '../../../utils/nodeTemplates';
import { cloneASTNode } from '../../../utils/cloning';
import { CairoFunctionDefinition } from '../../../ast/cairoNodes';

const INDENT = ' '.repeat(4);

export class ExternalDynArrayAllocator extends StringIndexedFuncGen {
  gen(
    node: FunctionDefinition,
    dArrayStruct: VariableDeclaration,
    structDef: CairoFunctionDefinition,
  ): FunctionCall {
    assert(dArrayStruct.vType !== undefined);
    const functionInputs: Identifier[] = [createIdentifier(dArrayStruct, this.ast)];
    const name = this.getOrCreate(dArrayStruct, structDef);
    const functionStub = createCairoFunctionStub(
      name,
      [['dynarray', cloneASTNode(dArrayStruct.vType, this.ast), DataLocation.CallData]],
      [['dynarray_loc', cloneASTNode(dArrayStruct.vType, this.ast), DataLocation.Memory]],
      ['syscall_ptr', 'range_check_ptr', 'warp_memory'],
      this.ast,
      node,
    );
    return createCallToFunction(functionStub, [...functionInputs], this.ast);
  }

  private getOrCreate(varDecl: VariableDeclaration, structDef: CairoFunctionDefinition): string {
    assert(varDecl.vType instanceof ArrayTypeName);
    const elementCairoType = CairoType.fromSol(
      typeNameToTypeNode(varDecl.vType.vBaseType),
      this.ast,
      TypeConversionContext.MemoryAllocation,
    );
    const key = elementCairoType.toString();
    const existing = this.generatedFunctions.get(key);
    if (existing != undefined) {
      return existing.name;
    }

    const name = `wm_dynarry_alloc_${key}`;

    this.generatedFunctions.set(key, {
      name: name,
      code: [
        `func ${name}{`,
        `${INDENT}syscall_ptr: felt*, range_check_ptr : felt, warp_memory : DictAccess*}(`,
        `${INDENT}dyn_array_struct : ${structDef.name}) -> (dynarry_loc : felt):`,
        `${INDENT}alloc_locals`,
        `${INDENT}let (array_len_uint256) = warp_uint256(dyn_array_struct.len)`,
        `${INDENT}let (dynarray_loc) = wm_new(array_len_uint256, ${uint256(
          BigInt(elementCairoType.width),
        )})`,
        `${INDENT}wm_dynarray_write_${key}(dynarray_loc+2, dyn_array_struct.len, dyn_array_struct.ptr, ${elementCairoType.width})`,
        `${INDENT}return (dynarray_loc)`,
        `end`,
      ].join('\n'),
    });
    this.requireImport('warplib.memory', 'wm_new');
    this.requireImport('warplib.maths.int_conversions', 'warp_uint256');
    return name;
  }
}