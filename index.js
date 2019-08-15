'use strict'

const AudioBuffer = require('audio-buffer')
const {read: readUInt4, write: writeUInt4} = require('uint4')
const oscillate = require('audio-oscillator/sin')
const transform = require('through2')
const Float32Array = require('core-js/stable/typed-array/float32-array')
const concat = require('concat-typed-array')
const ft = require('fourier-transform')
const maxBy = require('lodash/maxBy')
const {Transform} = require('stream')

const SAMPLE_RATE = 44100
// ~1 second
const FRAME_LENGTH = Math.pow(2, Math.round(Math.log2(SAMPLE_RATE / 4)))
const FT_SIZE = FRAME_LENGTH / 4 // todo: is this correct?

function encode (buf, _, cb) {
	// todo: optimize
	for (let i = 0; i < buf.byteLength * 2; i++) {
		const audioBuf = new AudioBuffer({
			length: FRAME_LENGTH,
			sampleRate: SAMPLE_RATE,
			numberOfChannels: 1
		})
		const freq = 100 + 100 * readUInt4(buf, i / 2)
		oscillate(audioBuf, freq)
		this.push(audioBuf)
	}
	cb()
}

const encoder = () => transform.obj(encode)

const decoder = () => {
	let inBuf = new Float32Array()
	// todo: increase chunk size?
	let outBuf = Buffer.alloc(4), outOffset = 0
	let prevFreq = NaN, sameFreqFor = 0

	const onData = () => {
		// console.error('onData', inBuf.length)
		const spectrum = ft(inBuf.slice(0, FT_SIZE))
		inBuf = inBuf.slice(FT_SIZE)

		// console.error(spectrum.map((v, i) => [i, +v.toFixed(3)]).filter(([_, v]) => v>.3))
		const peak = maxBy(spectrum.map((v, i) => [i, v]), ([_, v]) => v)
		if (peak[0] === 0) return;
		const rawFreq = peak[0] * SAMPLE_RATE / FT_SIZE
		const freq = Math.round(rawFreq / 100) * 100

		if (freq === prevFreq) {
			sameFreqFor++
			if (sameFreqFor < FRAME_LENGTH / FT_SIZE) return;
			sameFreqFor = 0
		} else {
			prevFreq = freq
			sameFreqFor = 0
		}

		const val = (freq - 100) / 100
		writeUInt4(outBuf, val, outOffset / 2)
		outOffset++
		if (outOffset / 2 >= outBuf.byteLength) {
			decoder.push(outBuf)
			outBuf = Buffer.alloc(4)
			outOffset = 0
		}
	}

	const write = (audioBuf, _, cb) => {
		inBuf = concat(Float32Array, inBuf, audioBuf.getChannelData(0))
		while (inBuf.length >= FT_SIZE) onData()
		cb()
	}
	const flush = (cb) => {
		if (inBuf.length > 0) {
			inBuf = concat(Float32Array, inBuf, new Float32Array(FT_SIZE - inBuf.length))
			onData()
		}
		if (outOffset > 0) decoder.push(outBuf.slice(0, outOffset - 1))
		cb()
	}

	const decoder = new Transform({objectMode: true, write, flush})
	return decoder
}

module.exports = {encoder, decoder}
