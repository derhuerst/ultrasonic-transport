'use strict'

const AudioBuffer = require('audio-buffer')
const {read: readUInt4, write: writeUInt4} = require('uint4')
const {Transform} = require('stream')
const oscillate = require('audio-oscillator/sin')
const Float32Array = require('core-js/stable/typed-array/float32-array')
const concat = require('concat-typed-array')
const ft = require('fourier-transform')
const maxBy = require('lodash/maxBy')
const {profile, fadeInFadeOut} = require('./lib')

const {
	sampleRate: SAMPLE_RATE, // Hz
	minFreq: MIN_FREQ,
	maxFreq: MAX_FREQ,
	freqInterval: FREQ_INTERVAL, // Hz
	ftSize: FT_SIZE
} = profile({minFreq: 100, maxFreq: 1600, freqInterval: 100})
const FRAME_LENGTH = FT_SIZE * 2 // todo?

const encoder = () => {
	const encode = (buf, _, cb) => {
		// todo: optimize
		for (let i = 0; i < buf.byteLength * 2; i++) {
			const val = readUInt4(buf, i / 2)
			const freq = 100 + 100 * val

			const audioBuf = new AudioBuffer({
				length: FRAME_LENGTH,
				sampleRate: SAMPLE_RATE,
				numberOfChannels: 1
			})
			oscillate(audioBuf, freq)
			fadeInFadeOut(audioBuf)
			encoder.push(audioBuf)
		}
		cb()
	}

	const encoder = new Transform({objectMode: true, write: encode})
	return encoder
}

const decoder = () => {
	let inBuf = new Float32Array()
	// todo: increase chunk size?
	let outBuf = Buffer.alloc(4), outOffset = 0
	let prevFreq = NaN, sameFreqFor = 0

	const decode = () => {
		const spectrum = ft(inBuf.slice(0, FT_SIZE)).map((v, i) => [i, v])
		inBuf = inBuf.slice(FT_SIZE)

		const [peakAt, peak] = maxBy(spectrum, ([_, v]) => v)
		if (peak < .03) return;
		const rawFreq = peakAt * SAMPLE_RATE / FT_SIZE
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
		while (inBuf.length >= FT_SIZE) decode()
		cb()
	}
	const flush = (cb) => {
		if (inBuf.length > 0) {
			inBuf = concat(Float32Array, inBuf, new Float32Array(FT_SIZE - inBuf.length))
			decode()
		}
		if (outOffset > 0) decoder.push(outBuf.slice(0, outOffset - 1))
		cb()
	}

	const decoder = new Transform({objectMode: true, write, flush})
	return decoder
}

module.exports = {encoder, decoder}
