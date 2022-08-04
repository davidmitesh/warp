"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serialiseReads = void 0;
const cairoTypeSystem_1 = require("../utils/cairoTypeSystem");
const errors_1 = require("../utils/errors");
function serialiseReads(type, readFelt, readId) {
    const packExpression = producePackExpression(type);
    const reads = [];
    const packString = packExpression
        .map((elem) => {
        if (elem === Read.Felt) {
            reads.push(readFelt(reads.length));
            return `read${reads.length - 1}`;
        }
        else if (elem === Read.Id) {
            reads.push(readId(reads.length));
            return `read${reads.length - 1}`;
        }
        else {
            return elem;
        }
    })
        .join('');
    return [reads, packString];
}
exports.serialiseReads = serialiseReads;
var Read;
(function (Read) {
    Read[Read["Felt"] = 0] = "Felt";
    Read[Read["Id"] = 1] = "Id";
})(Read || (Read = {}));
function producePackExpression(type) {
    if (type instanceof cairoTypeSystem_1.WarpLocation)
        return [Read.Id];
    if (type instanceof cairoTypeSystem_1.CairoFelt)
        return [Read.Felt];
    if (type instanceof cairoTypeSystem_1.CairoTuple) {
        return ['(', ...type.members.flatMap((member) => [...producePackExpression(member), ',']), ')'];
    }
    if (type instanceof cairoTypeSystem_1.CairoStruct) {
        return [
            type.name,
            '(',
            ...[...type.members.entries()]
                .flatMap(([memberName, memberType]) => [
                memberName,
                '=',
                ...producePackExpression(memberType),
                ',',
            ])
                .slice(0, -1),
            ')',
        ];
    }
    throw new errors_1.TranspileFailedError(`Attempted to produce pack expression for unexpected cairo type ${type.toString()}`);
}
//# sourceMappingURL=serialisation.js.map