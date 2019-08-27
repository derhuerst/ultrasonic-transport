'use strict'

const {Readable, Writable} = require('stream')
const transform = require('through2')
const pcm = require('pcm-util')

const fromBuf = (buf) => {
	let offset = 0
	const out = new Readable({
		read: (size) => {
			while (true) {
				const chunk = buf.slice(offset, offset + size)
				offset += size
				const shouldContinue = out.push(chunk)
				if (offset >= buf.byteLength) return out.push(null)
				if (!shouldContinue) break
			}
		}
	})
	return out
}

const toBuf = (buf) => {
	let offset = 0
	return new Writable({
		write: (chunk, _, cb) => {
			offset += chunk.copy(buf, offset)
			cb()
		}
	})
}

const encodePcm = (audioBuf, _, cb) => {
	cb(null, Buffer.from(pcm.toArrayBuffer(audioBuf, {
		channels: 1, sampleRate: 44100
	})))
}
const pcmEncoder = () => transform.obj(encodePcm)

const decodePcm = (buf, _, cb) => {
	cb(null, pcm.toAudioBuffer(buf, {
		channels: 1, sampleRate: 44100
	}))
}
const pcmDecoder = () => transform.obj(decodePcm)

module.exports = {
	fromBuf, toBuf,
	pcmEncoder, pcmDecoder
}
