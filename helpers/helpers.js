module.exports.last = arr => (arr && arr.length ? arr[arr.length - 1] : undefined);
module.exports.initializeArrayWithRange = (end, start = 0, step = 1) =>
    Array.from({ length: Math.ceil((end - start + 1) / step) }, (v, i) => i * step + start);
module.exports.replaceName = (name, author= '') =>
    name.replace(new RegExp(`^(Gra )|(Gra ${author} )|(${author} Gra )`,'i'), ``);
