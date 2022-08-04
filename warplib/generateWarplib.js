"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const int_1 = require("./implementations/conversions/int");
const add_1 = require("./implementations/maths/add");
const bitwise_not_1 = require("./implementations/maths/bitwise_not");
const div_1 = require("./implementations/maths/div");
const exp_1 = require("./implementations/maths/exp");
const ge_1 = require("./implementations/maths/ge");
const gt_1 = require("./implementations/maths/gt");
const le_1 = require("./implementations/maths/le");
const lt_1 = require("./implementations/maths/lt");
const mod_1 = require("./implementations/maths/mod");
const mul_1 = require("./implementations/maths/mul");
const negate_1 = require("./implementations/maths/negate");
const shl_1 = require("./implementations/maths/shl");
const shr_1 = require("./implementations/maths/shr");
const sub_1 = require("./implementations/maths/sub");
const external_input_checks_ints_1 = require("./implementations/external_input_checks/external_input_checks_ints");
(0, add_1.add)();
(0, add_1.add_unsafe)();
(0, add_1.add_signed)();
(0, add_1.add_signed_unsafe)();
//sub - handwritten
(0, sub_1.sub_unsafe)();
(0, sub_1.sub_signed)();
(0, sub_1.sub_signed_unsafe)();
(0, mul_1.mul)();
(0, mul_1.mul_unsafe)();
(0, mul_1.mul_signed)();
(0, mul_1.mul_signed_unsafe)();
//div - handwritten
(0, div_1.div_signed)();
(0, div_1.div_signed_unsafe)();
// mod - handwritten
(0, mod_1.mod_signed)();
(0, exp_1.exp)();
(0, exp_1.exp_signed)();
(0, exp_1.exp_unsafe)();
(0, exp_1.exp_signed_unsafe)();
(0, negate_1.negate)();
(0, shl_1.shl)();
(0, shr_1.shr)();
(0, shr_1.shr_signed)();
//ge - handwritten
(0, ge_1.ge_signed)();
//gt - handwritten
(0, gt_1.gt_signed)();
//le - handwritten
(0, le_1.le_signed)();
//lt - handwritten
(0, lt_1.lt_signed)();
//xor - handwritten
//bitwise_and - handwritten
//bitwise_or - handwritten
(0, bitwise_not_1.bitwise_not)();
// ---conversions---
(0, int_1.int_conversions)();
// ---external_input_checks---
(0, external_input_checks_ints_1.external_input_check_ints)();
// and - handwritten
// or - handwritten
//# sourceMappingURL=generateWarplib.js.map