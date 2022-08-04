"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parse = exports.SyntaxError = void 0;
const utils_1 = require("../utils/utils");
function peg$padEnd(str, targetLength, padString) {
    padString = padString || ' ';
    if (str.length > targetLength) {
        return str;
    }
    targetLength -= str.length;
    padString += padString.repeat(targetLength);
    return str + padString.slice(0, targetLength);
}
class SyntaxError extends Error {
    constructor(message, expected, found, location) {
        super();
        this.message = message;
        this.expected = expected;
        this.found = found;
        this.location = location;
        this.name = 'SyntaxError';
        if (typeof Object.setPrototypeOf === 'function') {
            Object.setPrototypeOf(this, SyntaxError.prototype);
        }
        else {
            this.__proto__ = SyntaxError.prototype;
        }
        if (typeof Error.captureStackTrace === 'function') {
            Error.captureStackTrace(this, SyntaxError);
        }
    }
    static buildMessage(expected, found) {
        function hex(ch) {
            return ch.charCodeAt(0).toString(16).toUpperCase();
        }
        function literalEscape(s) {
            return s
                .replace(/\\/g, '\\\\')
                .replace(/"/g, '\\"')
                .replace(/\0/g, '\\0')
                .replace(/\t/g, '\\t')
                .replace(/\n/g, '\\n')
                .replace(/\r/g, '\\r')
                .replace(/[\x00-\x0F]/g, (ch) => '\\x0' + hex(ch))
                .replace(/[\x10-\x1F\x7F-\x9F]/g, (ch) => '\\x' + hex(ch));
        }
        function classEscape(s) {
            return s
                .replace(/\\/g, '\\\\')
                .replace(/\]/g, '\\]')
                .replace(/\^/g, '\\^')
                .replace(/-/g, '\\-')
                .replace(/\0/g, '\\0')
                .replace(/\t/g, '\\t')
                .replace(/\n/g, '\\n')
                .replace(/\r/g, '\\r')
                .replace(/[\x00-\x0F]/g, (ch) => '\\x0' + hex(ch))
                .replace(/[\x10-\x1F\x7F-\x9F]/g, (ch) => '\\x' + hex(ch));
        }
        function describeExpectation(expectation) {
            switch (expectation.type) {
                case 'literal':
                    return '"' + literalEscape(expectation.text) + '"';
                case 'class':
                    const escapedParts = expectation.parts.map((part) => {
                        return Array.isArray(part)
                            ? classEscape(part[0]) + '-' + classEscape(part[1])
                            : classEscape(part);
                    });
                    return '[' + (expectation.inverted ? '^' : '') + escapedParts + ']';
                case 'any':
                    return 'any character';
                case 'end':
                    return 'end of input';
                case 'other':
                    return expectation.description;
            }
        }
        function describeExpected(expected1) {
            const descriptions = expected1.map(describeExpectation);
            let i;
            let j;
            descriptions.sort();
            if (descriptions.length > 0) {
                for (i = 1, j = 1; i < descriptions.length; i++) {
                    if (descriptions[i - 1] !== descriptions[i]) {
                        descriptions[j] = descriptions[i];
                        j++;
                    }
                }
                descriptions.length = j;
            }
            switch (descriptions.length) {
                case 1:
                    return descriptions[0];
                case 2:
                    return descriptions[0] + ' or ' + descriptions[1];
                default:
                    return (descriptions.slice(0, -1).join(', ') + ', or ' + descriptions[descriptions.length - 1]);
            }
        }
        function describeFound(found1) {
            return found1 ? '"' + literalEscape(found1) + '"' : 'end of input';
        }
        return 'Expected ' + describeExpected(expected) + ' but ' + describeFound(found) + ' found.';
    }
    format(sources) {
        let str = 'Error: ' + this.message;
        if (this.location) {
            let src = null;
            let k;
            for (k = 0; k < sources.length; k++) {
                if (sources[k].source === this.location.source) {
                    src = sources[k].text.split(/\r\n|\n|\r/g);
                    break;
                }
            }
            let s = this.location.start;
            let loc = this.location.source + ':' + s.line + ':' + s.column;
            if (src) {
                let e = this.location.end;
                let filler = peg$padEnd('', s.line.toString().length, ' ');
                let line = src[s.line - 1];
                let last = s.line === e.line ? e.column : line.length + 1;
                str +=
                    '\n --> ' +
                        loc +
                        '\n' +
                        filler +
                        ' |\n' +
                        s.line +
                        ' | ' +
                        line +
                        '\n' +
                        filler +
                        ' | ' +
                        peg$padEnd('', s.column - 1, ' ') +
                        peg$padEnd('', last - s.column, '^');
            }
            else {
                str += '\n at ' + loc;
            }
        }
        return str;
    }
}
exports.SyntaxError = SyntaxError;
function peg$parse(input, options) {
    options = options !== undefined ? options : {};
    const peg$FAILED = {};
    const peg$source = options.grammarSource;
    const peg$startRuleFunctions = { Signature: peg$parseSignature };
    let peg$startRuleFunction = peg$parseSignature;
    const peg$c0 = '()';
    const peg$c1 = peg$literalExpectation('()', false);
    const peg$c2 = function (name) {
        const loc = location();
        return (input) => {
            if (!(input instanceof Array)) {
                error(`Expected input to be array: ${input}`, loc);
                throw 'error already raised';
            }
            if (input.length > 0) {
                error(`${name} expects no arguments`);
                throw 'error already raised';
            }
            return [];
        };
    };
    const peg$c3 = '(';
    const peg$c4 = peg$literalExpectation('(', false);
    const peg$c5 = ')';
    const peg$c6 = peg$literalExpectation(')', false);
    const peg$c7 = function (args) {
        const loc = location();
        return (input) => {
            if (!(input instanceof Array)) {
                error(`Expected input to be array: ${input}`, loc);
                throw 'error already raised';
            }
            return args(input);
        };
    };
    const peg$c8 = ',';
    const peg$c9 = peg$literalExpectation(',', false);
    const peg$c10 = function (head, tail) {
        const loc = location();
        return (input) => {
            if (!(input instanceof Array)) {
                error(`b Expected input to be array: ${input}`, loc);
                throw 'error already raised, appeasing the typesystem';
            }
            if (input.length !== tail.length + 1)
                error(`Expected ${tail.length + 1} arguments not ${input.length}`);
            return [
                ...head(input[0]),
                ...tail.flatMap(([_, __, ___, pf], i) => pf(input[i + 1])),
            ];
        };
    };
    const peg$c11 = function (args) {
        return args;
    };
    const peg$c12 = function (t, array) {
        return (input) => array.reduce((result, af) => af(result), t)(input);
    };
    const peg$c13 = function (t) {
        return t;
    };
    const peg$c14 = '[]';
    const peg$c15 = peg$literalExpectation('[]', false);
    const peg$c16 = function () {
        const loc = location();
        return (f) => (input) => {
            if (!(input instanceof Array)) {
                error(`c Expected input to be array: ${input}`, loc);
                throw 'error already raised, appeasing the typesystem';
            }
            return [BigInt(input.length), ...input.flatMap(f)];
        };
    };
    const peg$c17 = '[';
    const peg$c18 = peg$literalExpectation('[', false);
    const peg$c19 = ']';
    const peg$c20 = peg$literalExpectation(']', false);
    const peg$c21 = function (i) {
        const loc = location();
        return (f) => (input) => {
            if (!(input instanceof Array)) {
                error(`d Expected input to be array: ${input}`, loc);
                throw 'error already raised, appeasing the typesystem';
            }
            if (input.length !== i)
                error(`Expected input to have ${i} elements`);
            return input.flatMap(f);
        };
    };
    const peg$c22 = 'uint';
    const peg$c23 = peg$literalExpectation('uint', false);
    const peg$c24 = function (width) {
        return (input) => {
            if (input instanceof Array) {
                error(`Expected input to be number: ${input}`);
                throw 'error already raised, appeasing the typesystem';
            }
            let i;
            try {
                i = BigInt(input);
            }
            catch {
                error(`Expected input to be number: ${input}`);
                throw 'error already raised, appeasing the typesystem';
            }
            if (i >= 2n ** BigInt(width))
                error(`Uint${width} exceeds bound: ${input}`);
            if (i < 0n)
                error(`Uint${width} is less than zero: ${input}`);
            return (0, utils_1.toUintOrFelt)(i, width);
        };
    };
    const peg$c25 = 'int';
    const peg$c26 = peg$literalExpectation('int', false);
    const peg$c27 = function (width) {
        return (input) => {
            if (input instanceof Array) {
                error(`Expected input to be number: ${input}`);
                throw 'error already raised, appeasing the typesystem';
            }
            let i;
            try {
                i = BigInt(input);
            }
            catch {
                error(`Expected input to be number: ${input}`);
                throw 'error already raised, appeasing the typesystem';
            }
            if (i >= 2n ** BigInt(width - 1))
                error(`Int${width} exceeds bound: ${input}`);
            if (i < -(2n ** BigInt(width - 1)))
                error(`Int${width} exceeds bound: ${input}`);
            return (0, utils_1.toUintOrFelt)(i, width);
        };
    };
    const peg$c28 = function () {
        return (input) => {
            if (input instanceof Array) {
                error(`Expected input to be number: ${input}`);
                throw 'error already raised, appeasing the typesystem';
            }
            let i;
            try {
                i = BigInt(input);
            }
            catch {
                error(`Expected input to be number: ${input}`);
                throw 'error already raised, appeasing the typesystem';
            }
            if (i >= 2n ** BigInt(256n))
                error(`Uint256 exceeds bound: ${input}`);
            if (i < 0n)
                error(`Uint256 is less than zero: ${input}`);
            return (0, utils_1.toUintOrFelt)(i, 256);
        };
    };
    const peg$c29 = function () {
        return (input) => {
            if (input instanceof Array) {
                error(`Expected input to be number: ${input}`);
                throw 'error already raised, appeasing the typesystem';
            }
            let i;
            try {
                i = BigInt(input);
            }
            catch {
                error(`Expected input to be number: ${input}`);
                throw 'error already raised, appeasing the typesystem';
            }
            if (i >= 2n ** BigInt(255n))
                error(`Int256 exceeds bound: ${input}`);
            if (i < -(2n ** BigInt(255n)))
                error(`Int256 exceeds bound: ${input}`);
            return (0, utils_1.toUintOrFelt)(i, 256);
        };
    };
    const peg$c30 = 'address';
    const peg$c31 = peg$literalExpectation('address', false);
    const peg$c32 = function () {
        return (input) => {
            if (input instanceof Array) {
                error(`Expected input to be number: ${input}`);
                throw 'error already raised, appeasing the typesystem';
            }
            let i;
            try {
                i = BigInt(input);
            }
            catch {
                error(`Expected input to be number: ${input}`);
                throw 'error already raised, appeasing the typesystem';
            }
            if (i >= 2n ** BigInt(251))
                error(`Address exceeds bound: ${input}`);
            if (i < 0n)
                error(`Address is less than zero: ${input}`);
            return (0, utils_1.toUintOrFelt)(i, 251);
        };
    };
    const peg$c33 = 'bool';
    const peg$c34 = peg$literalExpectation('bool', false);
    const peg$c35 = function () {
        return (input) => {
            if (input instanceof Array) {
                error(`Expected bool to be number, true or false: ${input}`);
                throw 'error already raised, appeasing the typesystem';
            }
            if (input === 'true')
                return [1n];
            if (input === 'false')
                return [0n];
            let b;
            try {
                b = BigInt(input);
            }
            catch {
                error(`Expected input to be a boolean: ${input}`);
                throw 'error already raised, appeasing the typesystem';
            }
            if (b === 1n)
                return [1n];
            if (b === 0n)
                return [0n];
            error(`${input} can't be parsed as a boolean`);
        };
    };
    const peg$c36 = 'bytes';
    const peg$c37 = peg$literalExpectation('bytes', false);
    const peg$c38 = function (len) {
        return (input) => {
            if (input instanceof Array) {
                error(`Expected input to be number: ${input}`);
                throw 'error already raised, appeasing the typesystem';
            }
            let i;
            try {
                i = BigInt(input);
            }
            catch {
                error(`Expected input to be number: ${input}`);
                throw 'error already raised, appeasing the typesystem';
            }
            if (i >= 2n ** BigInt(len * 8))
                error(`Bytes${len} exceeds bound: ${input}`);
            if (i < 0n)
                error(`Byte${len} is less than zero: ${input}`);
            return (0, utils_1.toUintOrFelt)(i, len * 8);
        };
    };
    const peg$c39 = function () {
        return (input) => {
            if (!(input instanceof Array)) {
                error(`d Expected input to be array: ${input}`);
                throw 'error already raised, appeasing the typesystem';
            }
            return [
                BigInt(input.length),
                ...input.flatMap((val) => {
                    if (val instanceof Array) {
                        error(`Expected input to be number: ${input}`);
                        throw 'error already raised, appeasing the typesystem';
                    }
                    let i;
                    try {
                        i = BigInt(val);
                    }
                    catch {
                        error(`Expected input to be number: ${input}`);
                        throw 'error already raised, appeasing the typesystem';
                    }
                    if (i >= 2n ** 8n)
                        error(`Byte exceeded bound: ${input}`);
                    if (i < 0n)
                        error(`Byte is less than zero: ${input}`);
                    return (0, utils_1.toUintOrFelt)(i, 8);
                }),
            ];
        };
    };
    const peg$c40 = 'string';
    const peg$c41 = peg$literalExpectation('string', false);
    const peg$c42 = function () {
        return (input) => {
            if (!(typeof input === 'string')) {
                error(`Expected input to be string: ${input}`);
                throw 'error already raised, appeasing the typesystem';
            }
            const buff = Buffer.from(input);
            const byteCode = buff.toJSON().data;
            return [BigInt(byteCode.length), ...byteCode.map(BigInt)];
        };
    };
    const peg$c43 = peg$otherExpectation('integer');
    const peg$c44 = /^[0-9]/;
    const peg$c45 = peg$classExpectation([['0', '9']], false, false);
    const peg$c46 = '0x';
    const peg$c47 = peg$literalExpectation('0x', false);
    const peg$c48 = /^[0-9a-fA-F]/;
    const peg$c49 = peg$classExpectation([
        ['0', '9'],
        ['a', 'f'],
        ['A', 'F'],
    ], false, false);
    const peg$c50 = function () {
        return parseInt(text(), 10);
    };
    const peg$c51 = /^[a-zA-Z_0-9]/;
    const peg$c52 = peg$classExpectation([['a', 'z'], ['A', 'Z'], '_', ['0', '9']], false, false);
    const peg$c53 = peg$otherExpectation('whitespace');
    const peg$c54 = /^[ \t\n\r]/;
    const peg$c55 = peg$classExpectation([' ', '\t', '\n', '\r'], false, false);
    let peg$currPos = 0;
    let peg$savedPos = 0;
    const peg$posDetailsCache = [{ line: 1, column: 1 }];
    let peg$maxFailPos = 0;
    let peg$maxFailExpected = [];
    let peg$silentFails = 0;
    let peg$result;
    if (options.startRule !== undefined) {
        if (!(options.startRule in peg$startRuleFunctions)) {
            throw new Error('Can\'t start parsing from rule "' + options.startRule + '".');
        }
        peg$startRuleFunction = peg$startRuleFunctions[options.startRule];
    }
    function text() {
        return input.substring(peg$savedPos, peg$currPos);
    }
    function location() {
        return peg$computeLocation(peg$savedPos, peg$currPos);
    }
    function expected(description, location1) {
        location1 =
            location1 !== undefined ? location1 : peg$computeLocation(peg$savedPos, peg$currPos);
        throw peg$buildStructuredError([peg$otherExpectation(description)], input.substring(peg$savedPos, peg$currPos), location1);
    }
    function error(message, location1) {
        location1 =
            location1 !== undefined ? location1 : peg$computeLocation(peg$savedPos, peg$currPos);
        throw peg$buildSimpleError(message, location1);
    }
    function peg$literalExpectation(text1, ignoreCase) {
        return { type: 'literal', text: text1, ignoreCase: ignoreCase };
    }
    function peg$classExpectation(parts, inverted, ignoreCase) {
        return { type: 'class', parts: parts, inverted: inverted, ignoreCase: ignoreCase };
    }
    function peg$anyExpectation() {
        return { type: 'any' };
    }
    function peg$endExpectation() {
        return { type: 'end' };
    }
    function peg$otherExpectation(description) {
        return { type: 'other', description: description };
    }
    function peg$computePosDetails(pos) {
        let details = peg$posDetailsCache[pos];
        let p;
        if (details) {
            return details;
        }
        else {
            p = pos - 1;
            while (!peg$posDetailsCache[p]) {
                p--;
            }
            details = peg$posDetailsCache[p];
            details = {
                line: details.line,
                column: details.column,
            };
            while (p < pos) {
                if (input.charCodeAt(p) === 10) {
                    details.line++;
                    details.column = 1;
                }
                else {
                    details.column++;
                }
                p++;
            }
            peg$posDetailsCache[pos] = details;
            return details;
        }
    }
    function peg$computeLocation(startPos, endPos) {
        const startPosDetails = peg$computePosDetails(startPos);
        const endPosDetails = peg$computePosDetails(endPos);
        return {
            source: peg$source,
            start: {
                offset: startPos,
                line: startPosDetails.line,
                column: startPosDetails.column,
            },
            end: {
                offset: endPos,
                line: endPosDetails.line,
                column: endPosDetails.column,
            },
        };
    }
    function peg$fail(expected1) {
        if (peg$currPos < peg$maxFailPos) {
            return;
        }
        if (peg$currPos > peg$maxFailPos) {
            peg$maxFailPos = peg$currPos;
            peg$maxFailExpected = [];
        }
        peg$maxFailExpected.push(expected1);
    }
    function peg$buildSimpleError(message, location1) {
        return new SyntaxError(message, [], '', location1);
    }
    function peg$buildStructuredError(expected1, found, location1) {
        return new SyntaxError(SyntaxError.buildMessage(expected1, found), expected1, found, location1);
    }
    function peg$parseSignature() {
        let s0, s1, s2, s3, s4;
        s0 = peg$currPos;
        s1 = peg$parseFuncName();
        if (s1 !== peg$FAILED) {
            if (input.substr(peg$currPos, 2) === peg$c0) {
                s2 = peg$c0;
                peg$currPos += 2;
            }
            else {
                s2 = peg$FAILED;
                if (peg$silentFails === 0) {
                    peg$fail(peg$c1);
                }
            }
            if (s2 !== peg$FAILED) {
                peg$savedPos = s0;
                s1 = peg$c2(s1);
                s0 = s1;
            }
            else {
                peg$currPos = s0;
                s0 = peg$FAILED;
            }
        }
        else {
            peg$currPos = s0;
            s0 = peg$FAILED;
        }
        if (s0 === peg$FAILED) {
            s0 = peg$currPos;
            s1 = peg$parseFuncName();
            if (s1 !== peg$FAILED) {
                if (input.charCodeAt(peg$currPos) === 40) {
                    s2 = peg$c3;
                    peg$currPos++;
                }
                else {
                    s2 = peg$FAILED;
                    if (peg$silentFails === 0) {
                        peg$fail(peg$c4);
                    }
                }
                if (s2 !== peg$FAILED) {
                    s3 = peg$parseArguments();
                    if (s3 !== peg$FAILED) {
                        if (input.charCodeAt(peg$currPos) === 41) {
                            s4 = peg$c5;
                            peg$currPos++;
                        }
                        else {
                            s4 = peg$FAILED;
                            if (peg$silentFails === 0) {
                                peg$fail(peg$c6);
                            }
                        }
                        if (s4 !== peg$FAILED) {
                            peg$savedPos = s0;
                            s1 = peg$c7(s3);
                            s0 = s1;
                        }
                        else {
                            peg$currPos = s0;
                            s0 = peg$FAILED;
                        }
                    }
                    else {
                        peg$currPos = s0;
                        s0 = peg$FAILED;
                    }
                }
                else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                }
            }
            else {
                peg$currPos = s0;
                s0 = peg$FAILED;
            }
        }
        return s0;
    }
    function peg$parseArguments() {
        let s0, s1, s2, s3, s4, s5, s6, s7;
        s0 = peg$currPos;
        s1 = peg$parseType();
        if (s1 !== peg$FAILED) {
            s2 = [];
            s3 = peg$currPos;
            s4 = peg$parse_();
            if (s4 !== peg$FAILED) {
                if (input.charCodeAt(peg$currPos) === 44) {
                    s5 = peg$c8;
                    peg$currPos++;
                }
                else {
                    s5 = peg$FAILED;
                    if (peg$silentFails === 0) {
                        peg$fail(peg$c9);
                    }
                }
                if (s5 !== peg$FAILED) {
                    s6 = peg$parse_();
                    if (s6 !== peg$FAILED) {
                        s7 = peg$parseType();
                        if (s7 !== peg$FAILED) {
                            s4 = [s4, s5, s6, s7];
                            s3 = s4;
                        }
                        else {
                            peg$currPos = s3;
                            s3 = peg$FAILED;
                        }
                    }
                    else {
                        peg$currPos = s3;
                        s3 = peg$FAILED;
                    }
                }
                else {
                    peg$currPos = s3;
                    s3 = peg$FAILED;
                }
            }
            else {
                peg$currPos = s3;
                s3 = peg$FAILED;
            }
            while (s3 !== peg$FAILED) {
                s2.push(s3);
                s3 = peg$currPos;
                s4 = peg$parse_();
                if (s4 !== peg$FAILED) {
                    if (input.charCodeAt(peg$currPos) === 44) {
                        s5 = peg$c8;
                        peg$currPos++;
                    }
                    else {
                        s5 = peg$FAILED;
                        if (peg$silentFails === 0) {
                            peg$fail(peg$c9);
                        }
                    }
                    if (s5 !== peg$FAILED) {
                        s6 = peg$parse_();
                        if (s6 !== peg$FAILED) {
                            s7 = peg$parseType();
                            if (s7 !== peg$FAILED) {
                                s4 = [s4, s5, s6, s7];
                                s3 = s4;
                            }
                            else {
                                peg$currPos = s3;
                                s3 = peg$FAILED;
                            }
                        }
                        else {
                            peg$currPos = s3;
                            s3 = peg$FAILED;
                        }
                    }
                    else {
                        peg$currPos = s3;
                        s3 = peg$FAILED;
                    }
                }
                else {
                    peg$currPos = s3;
                    s3 = peg$FAILED;
                }
            }
            if (s2 !== peg$FAILED) {
                peg$savedPos = s0;
                s1 = peg$c10(s1, s2);
                s0 = s1;
            }
            else {
                peg$currPos = s0;
                s0 = peg$FAILED;
            }
        }
        else {
            peg$currPos = s0;
            s0 = peg$FAILED;
        }
        return s0;
    }
    function peg$parseType() {
        let s0, s1, s2, s3;
        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 40) {
            s1 = peg$c3;
            peg$currPos++;
        }
        else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
                peg$fail(peg$c4);
            }
        }
        if (s1 !== peg$FAILED) {
            s2 = peg$parseArguments();
            if (s2 !== peg$FAILED) {
                if (input.charCodeAt(peg$currPos) === 41) {
                    s3 = peg$c5;
                    peg$currPos++;
                }
                else {
                    s3 = peg$FAILED;
                    if (peg$silentFails === 0) {
                        peg$fail(peg$c6);
                    }
                }
                if (s3 !== peg$FAILED) {
                    peg$savedPos = s0;
                    s1 = peg$c11(s2);
                    s0 = s1;
                }
                else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                }
            }
            else {
                peg$currPos = s0;
                s0 = peg$FAILED;
            }
        }
        else {
            peg$currPos = s0;
            s0 = peg$FAILED;
        }
        if (s0 === peg$FAILED) {
            s0 = peg$currPos;
            s1 = peg$parseStaticType();
            if (s1 !== peg$FAILED) {
                s2 = [];
                s3 = peg$parseArraySuffix();
                if (s3 !== peg$FAILED) {
                    while (s3 !== peg$FAILED) {
                        s2.push(s3);
                        s3 = peg$parseArraySuffix();
                    }
                }
                else {
                    s2 = peg$FAILED;
                }
                if (s2 !== peg$FAILED) {
                    peg$savedPos = s0;
                    s1 = peg$c12(s1, s2);
                    s0 = s1;
                }
                else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                }
            }
            else {
                peg$currPos = s0;
                s0 = peg$FAILED;
            }
            if (s0 === peg$FAILED) {
                s0 = peg$currPos;
                s1 = peg$parseStaticType();
                if (s1 !== peg$FAILED) {
                    peg$savedPos = s0;
                    s1 = peg$c13(s1);
                }
                s0 = s1;
            }
        }
        return s0;
    }
    function peg$parseArraySuffix() {
        let s0, s1, s2, s3;
        s0 = peg$currPos;
        if (input.substr(peg$currPos, 2) === peg$c14) {
            s1 = peg$c14;
            peg$currPos += 2;
        }
        else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
                peg$fail(peg$c15);
            }
        }
        if (s1 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$c16();
        }
        s0 = s1;
        if (s0 === peg$FAILED) {
            s0 = peg$currPos;
            if (input.charCodeAt(peg$currPos) === 91) {
                s1 = peg$c17;
                peg$currPos++;
            }
            else {
                s1 = peg$FAILED;
                if (peg$silentFails === 0) {
                    peg$fail(peg$c18);
                }
            }
            if (s1 !== peg$FAILED) {
                s2 = peg$parseInteger();
                if (s2 !== peg$FAILED) {
                    if (input.charCodeAt(peg$currPos) === 93) {
                        s3 = peg$c19;
                        peg$currPos++;
                    }
                    else {
                        s3 = peg$FAILED;
                        if (peg$silentFails === 0) {
                            peg$fail(peg$c20);
                        }
                    }
                    if (s3 !== peg$FAILED) {
                        peg$savedPos = s0;
                        s1 = peg$c21(s2);
                        s0 = s1;
                    }
                    else {
                        peg$currPos = s0;
                        s0 = peg$FAILED;
                    }
                }
                else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                }
            }
            else {
                peg$currPos = s0;
                s0 = peg$FAILED;
            }
        }
        return s0;
    }
    function peg$parseStaticType() {
        let s0, s1, s2;
        s0 = peg$currPos;
        if (input.substr(peg$currPos, 4) === peg$c22) {
            s1 = peg$c22;
            peg$currPos += 4;
        }
        else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
                peg$fail(peg$c23);
            }
        }
        if (s1 !== peg$FAILED) {
            s2 = peg$parseInteger();
            if (s2 !== peg$FAILED) {
                peg$savedPos = s0;
                s1 = peg$c24(s2);
                s0 = s1;
            }
            else {
                peg$currPos = s0;
                s0 = peg$FAILED;
            }
        }
        else {
            peg$currPos = s0;
            s0 = peg$FAILED;
        }
        if (s0 === peg$FAILED) {
            s0 = peg$currPos;
            if (input.substr(peg$currPos, 3) === peg$c25) {
                s1 = peg$c25;
                peg$currPos += 3;
            }
            else {
                s1 = peg$FAILED;
                if (peg$silentFails === 0) {
                    peg$fail(peg$c26);
                }
            }
            if (s1 !== peg$FAILED) {
                s2 = peg$parseInteger();
                if (s2 !== peg$FAILED) {
                    peg$savedPos = s0;
                    s1 = peg$c27(s2);
                    s0 = s1;
                }
                else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                }
            }
            else {
                peg$currPos = s0;
                s0 = peg$FAILED;
            }
            if (s0 === peg$FAILED) {
                s0 = peg$currPos;
                if (input.substr(peg$currPos, 4) === peg$c22) {
                    s1 = peg$c22;
                    peg$currPos += 4;
                }
                else {
                    s1 = peg$FAILED;
                    if (peg$silentFails === 0) {
                        peg$fail(peg$c23);
                    }
                }
                if (s1 !== peg$FAILED) {
                    peg$savedPos = s0;
                    s1 = peg$c28();
                }
                s0 = s1;
                if (s0 === peg$FAILED) {
                    s0 = peg$currPos;
                    if (input.substr(peg$currPos, 3) === peg$c25) {
                        s1 = peg$c25;
                        peg$currPos += 3;
                    }
                    else {
                        s1 = peg$FAILED;
                        if (peg$silentFails === 0) {
                            peg$fail(peg$c26);
                        }
                    }
                    if (s1 !== peg$FAILED) {
                        peg$savedPos = s0;
                        s1 = peg$c29();
                    }
                    s0 = s1;
                    if (s0 === peg$FAILED) {
                        s0 = peg$currPos;
                        if (input.substr(peg$currPos, 7) === peg$c30) {
                            s1 = peg$c30;
                            peg$currPos += 7;
                        }
                        else {
                            s1 = peg$FAILED;
                            if (peg$silentFails === 0) {
                                peg$fail(peg$c31);
                            }
                        }
                        if (s1 !== peg$FAILED) {
                            peg$savedPos = s0;
                            s1 = peg$c32();
                        }
                        s0 = s1;
                        if (s0 === peg$FAILED) {
                            s0 = peg$currPos;
                            if (input.substr(peg$currPos, 4) === peg$c33) {
                                s1 = peg$c33;
                                peg$currPos += 4;
                            }
                            else {
                                s1 = peg$FAILED;
                                if (peg$silentFails === 0) {
                                    peg$fail(peg$c34);
                                }
                            }
                            if (s1 !== peg$FAILED) {
                                peg$savedPos = s0;
                                s1 = peg$c35();
                            }
                            s0 = s1;
                            if (s0 === peg$FAILED) {
                                s0 = peg$currPos;
                                if (input.substr(peg$currPos, 5) === peg$c36) {
                                    s1 = peg$c36;
                                    peg$currPos += 5;
                                }
                                else {
                                    s1 = peg$FAILED;
                                    if (peg$silentFails === 0) {
                                        peg$fail(peg$c37);
                                    }
                                }
                                if (s1 !== peg$FAILED) {
                                    s2 = peg$parseInteger();
                                    if (s2 !== peg$FAILED) {
                                        peg$savedPos = s0;
                                        s1 = peg$c38(s2);
                                        s0 = s1;
                                    }
                                    else {
                                        peg$currPos = s0;
                                        s0 = peg$FAILED;
                                    }
                                }
                                else {
                                    peg$currPos = s0;
                                    s0 = peg$FAILED;
                                }
                                if (s0 === peg$FAILED) {
                                    s0 = peg$currPos;
                                    if (input.substr(peg$currPos, 5) === peg$c36) {
                                        s1 = peg$c36;
                                        peg$currPos += 5;
                                    }
                                    else {
                                        s1 = peg$FAILED;
                                        if (peg$silentFails === 0) {
                                            peg$fail(peg$c37);
                                        }
                                    }
                                    if (s1 !== peg$FAILED) {
                                        peg$savedPos = s0;
                                        s1 = peg$c39();
                                    }
                                    s0 = s1;
                                    if (s0 === peg$FAILED) {
                                        s0 = peg$currPos;
                                        if (input.substr(peg$currPos, 6) === peg$c40) {
                                            s1 = peg$c40;
                                            peg$currPos += 6;
                                        }
                                        else {
                                            s1 = peg$FAILED;
                                            if (peg$silentFails === 0) {
                                                peg$fail(peg$c41);
                                            }
                                        }
                                        if (s1 !== peg$FAILED) {
                                            peg$savedPos = s0;
                                            s1 = peg$c42();
                                        }
                                        s0 = s1;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        return s0;
    }
    function peg$parseInteger() {
        let s0, s1, s2, s3, s4;
        peg$silentFails++;
        s0 = peg$currPos;
        s1 = [];
        if (peg$c44.test(input.charAt(peg$currPos))) {
            s2 = input.charAt(peg$currPos);
            peg$currPos++;
        }
        else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) {
                peg$fail(peg$c45);
            }
        }
        if (s2 !== peg$FAILED) {
            while (s2 !== peg$FAILED) {
                s1.push(s2);
                if (peg$c44.test(input.charAt(peg$currPos))) {
                    s2 = input.charAt(peg$currPos);
                    peg$currPos++;
                }
                else {
                    s2 = peg$FAILED;
                    if (peg$silentFails === 0) {
                        peg$fail(peg$c45);
                    }
                }
            }
        }
        else {
            s1 = peg$FAILED;
        }
        if (s1 === peg$FAILED) {
            s1 = peg$currPos;
            if (input.substr(peg$currPos, 2) === peg$c46) {
                s2 = peg$c46;
                peg$currPos += 2;
            }
            else {
                s2 = peg$FAILED;
                if (peg$silentFails === 0) {
                    peg$fail(peg$c47);
                }
            }
            if (s2 !== peg$FAILED) {
                s3 = [];
                if (peg$c48.test(input.charAt(peg$currPos))) {
                    s4 = input.charAt(peg$currPos);
                    peg$currPos++;
                }
                else {
                    s4 = peg$FAILED;
                    if (peg$silentFails === 0) {
                        peg$fail(peg$c49);
                    }
                }
                if (s4 !== peg$FAILED) {
                    while (s4 !== peg$FAILED) {
                        s3.push(s4);
                        if (peg$c48.test(input.charAt(peg$currPos))) {
                            s4 = input.charAt(peg$currPos);
                            peg$currPos++;
                        }
                        else {
                            s4 = peg$FAILED;
                            if (peg$silentFails === 0) {
                                peg$fail(peg$c49);
                            }
                        }
                    }
                }
                else {
                    s3 = peg$FAILED;
                }
                if (s3 !== peg$FAILED) {
                    s2 = [s2, s3];
                    s1 = s2;
                }
                else {
                    peg$currPos = s1;
                    s1 = peg$FAILED;
                }
            }
            else {
                peg$currPos = s1;
                s1 = peg$FAILED;
            }
        }
        if (s1 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$c50();
        }
        s0 = s1;
        peg$silentFails--;
        if (s0 === peg$FAILED) {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
                peg$fail(peg$c43);
            }
        }
        return s0;
    }
    function peg$parseFuncName() {
        let s0, s1;
        s0 = [];
        if (peg$c51.test(input.charAt(peg$currPos))) {
            s1 = input.charAt(peg$currPos);
            peg$currPos++;
        }
        else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
                peg$fail(peg$c52);
            }
        }
        while (s1 !== peg$FAILED) {
            s0.push(s1);
            if (peg$c51.test(input.charAt(peg$currPos))) {
                s1 = input.charAt(peg$currPos);
                peg$currPos++;
            }
            else {
                s1 = peg$FAILED;
                if (peg$silentFails === 0) {
                    peg$fail(peg$c52);
                }
            }
        }
        return s0;
    }
    function peg$parse_() {
        let s0, s1;
        peg$silentFails++;
        s0 = [];
        if (peg$c54.test(input.charAt(peg$currPos))) {
            s1 = input.charAt(peg$currPos);
            peg$currPos++;
        }
        else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
                peg$fail(peg$c55);
            }
        }
        while (s1 !== peg$FAILED) {
            s0.push(s1);
            if (peg$c54.test(input.charAt(peg$currPos))) {
                s1 = input.charAt(peg$currPos);
                peg$currPos++;
            }
            else {
                s1 = peg$FAILED;
                if (peg$silentFails === 0) {
                    peg$fail(peg$c55);
                }
            }
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
                peg$fail(peg$c53);
            }
        }
        return s0;
    }
    peg$result = peg$startRuleFunction();
    if (peg$result !== peg$FAILED && peg$currPos === input.length) {
        return peg$result;
    }
    else {
        if (peg$result !== peg$FAILED && peg$currPos < input.length) {
            peg$fail(peg$endExpectation());
        }
        throw peg$buildStructuredError(peg$maxFailExpected, peg$maxFailPos < input.length ? input.charAt(peg$maxFailPos) : null, peg$maxFailPos < input.length
            ? peg$computeLocation(peg$maxFailPos, peg$maxFailPos + 1)
            : peg$computeLocation(peg$maxFailPos, peg$maxFailPos));
    }
}
exports.parse = peg$parse;
//# sourceMappingURL=functionSignatureParser.js.map