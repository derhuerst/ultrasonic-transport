'use strict'

const from = require('from2')
const transform = require('through2')
const pcm = require('pcm-util')
const {encoder, decoder} = require('.')

const fromBuf = (buf) => {
	let offset = 0
	return from((size, cb) => {
		if (offset >= buf.byteLength) return cb(null, null)
		const chunk = buf.slice(offset, offset + size)
		offset += size
		cb(null, chunk)
	})
}

const encodePcm = (audioBuf, _, cb) => {
	cb(null, Buffer.from(pcm.toArrayBuffer(audioBuf, {
		channels: 1, sampleRate: 44100
	})))
}

// const decodePcm = (buf, _, cb) => {
// 	cb(null, pcm.toAudioBuffer(buf, {
// 		channels: 1, sampleRate: 44100
// 	}))
// }

fromBuf(Buffer.from('abab abab', 'utf-8'))
.pipe(encoder())
.pipe(transform.obj(encodePcm))
.pipe(process.stdout)
// .pipe(transform.obj(decodePcm))
// .pipe(decoder())
// .on('data', console.error)
