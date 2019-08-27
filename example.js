'use strict'

const {fromBuf, pcmEncoder, pcmDecoder} = require('./test-helpers')
const {encoder, decoder} = require('.')

// process.stdin
// .pipe(encoder())
// .pipe(pcmEncoder())
// .pipe(pcmDecoder())
// .pipe(decoder())
// .pipe(process.stdout)

if (process.argv[2] === 'receive') {
	process.stdin
	.pipe(pcmDecoder())
	.pipe(decoder())
	.pipe(process.stdout)
} else {
	// fromBuf(Buffer.from('ffff', 'hex'))
	process.stdin
	.pipe(encoder())
	.pipe(pcmEncoder())
	.pipe(process.stdout)
}
