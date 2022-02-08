import assert = require('assert');
import {
  Assignment,
  Block,
  ContractDefinition,
  ExpressionStatement,
  FunctionDefinition,
  FunctionKind,
  FunctionStateMutability,
  FunctionVisibility,
  getNodeType,
  Identifier,
  Literal,
  LiteralKind,
  Mapping,
  ParameterList,
  VariableDeclaration,
} from 'solc-typed-ast';
import { AST } from '../ast/ast';
import { CairoContract } from '../ast/cairoNodes';
import { ASTMapper } from '../ast/mapper';
import { implicitImports } from '../utils/implicits';
import { getFeltWidth } from '../utils/serialisation';
import { toHexString } from '../utils/utils';

export class StorageAllocator extends ASTMapper {
  visitContractDefinition(node: ContractDefinition, ast: AST): void {
    const initialisationBlock = new Block(ast.reserveId(), '', 'Block', []);

    let usedMemory = 0;
    let mappingCount = 0;
    const allocations: Map<VariableDeclaration, number> = new Map();
    node.vStateVariables.forEach((v) => {
      if (v.vType instanceof Mapping) {
        v.vValue = new Literal(
          ast.reserveId(),
          '',
          'Literal',
          v.typeString,
          LiteralKind.Number,
          toHexString(`${mappingCount}`),
          `${mappingCount}`,
        );
        v.vValue.parent = v;
        ++mappingCount;
      } else {
        const width = getFeltWidth(getNodeType(v, ast.compilerVersion));
        allocations.set(v, usedMemory);
        usedMemory += width;
        extractInitialisation(v, initialisationBlock, ast);
      }
    });
    insertIntoConstructor(initialisationBlock, node, ast);
    ast.replaceNode(
      node,
      new CairoContract(
        node.id,
        node.src,
        'CairoContract',
        node.name,
        node.scope,
        node.kind,
        node.abstract,
        node.fullyImplemented,
        node.linearizedBaseContracts,
        node.usedErrors,
        allocations,
        node.documentation,
        node.children,
        node.nameLocation,
        node.raw,
      ),
    );
  }
}

function insertIntoConstructor(initialisationBlock: Block, contract: ContractDefinition, ast: AST) {
  const constructor = contract.vConstructor;
  if (constructor === undefined) {
    const newConstructor = new FunctionDefinition(
      ast.reserveId(),
      '',
      'FunctionDefinition',
      contract.id,
      FunctionKind.Constructor,
      '',
      false,
      FunctionVisibility.Public,
      FunctionStateMutability.NonPayable,
      true,
      new ParameterList(ast.reserveId(), '', 'ParameterList', []),
      new ParameterList(ast.reserveId(), '', 'ParameterList', []),
      [],
      undefined,
      initialisationBlock,
    );
    contract.appendChild(newConstructor);
    ast.registerChild(newConstructor, contract);
  } else {
    const body = constructor.vBody;
    assert(body !== undefined, 'Expected existing constructor to be implemented');
    initialisationBlock.children
      .slice()
      .reverse()
      .forEach((statement) => {
        body.insertAtBeginning(statement);
      });
  }
}

function extractInitialisation(node: VariableDeclaration, initialisationBlock: Block, ast: AST) {
  if (node.vValue === undefined) return;

  initialisationBlock.appendChild(
    new ExpressionStatement(
      ast.reserveId(),
      node.src,
      'ExpressionStatement',
      new Assignment(
        ast.reserveId(),
        node.src,
        'Assignment',
        node.typeString,
        '=',
        new Identifier(
          ast.reserveId(),
          node.src,
          'Identifier',
          node.typeString,
          node.name,
          node.id,
        ),
        node.vValue,
      ),
    ),
  );

  node.vValue = undefined;

  // TODO move these into the implicits of the CairoFunctionDefinition for the constructor
  ast.addImports(implicitImports['syscall_ptr']);
  ast.addImports(implicitImports['pedersen_ptr']);
  ast.addImports(implicitImports['range_check_ptr']);
}
