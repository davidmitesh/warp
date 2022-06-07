pragma solidity ^0.8.10;

// SDPX-License-Identifier: MIT

contract WARP {
  uint[] x;
  uint[2] y;

  function setStatic(uint a, uint b) external returns (uint[2] memory) {
    y = [a,b];
    return y;
  }

  function copyStaticToDynamic() external returns (uint[] memory, uint[2] memory) {
    x = y;
    return (x,y);
  }

  uint[][] a;
  uint[2][2] b;

  function setStaticDeep(uint i, uint j, uint k, uint l) external returns (uint[2][2] memory) {
    b = [[i,j], [k,l]];
    return b;
  }

  function copyStaticToDynamicDeep() external returns (uint[] memory, uint[] memory, uint[2][2] memory) {
    a = b;
    return (a[0], a[1],b);
  }

  uint[][2] c;
  function copyStaticStaticToStaticDynamic() external returns (uint[] memory, uint[] memory, uint[2][2] memory) {
    c = b;
    return (c[0], c[1], b);
  }

  uint[2][] d;
  function copyStaticStaticToDynamicStatic() external returns (uint, uint, uint, uint, uint[2][2] memory) {
    d = b;
    return (d[0][0], d[0][1], d[1][0], d[1][1], b);
  }
}