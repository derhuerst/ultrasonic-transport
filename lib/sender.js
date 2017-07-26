'use strict'

const AudioBuffer = require('audio-buffer')
const Writable = require('readable-stream/writable')
const createOscillator = require('audio-oscillator')
const createSpeaker = require('audio-speaker/direct')

const createSender = (ctx, interval) => {
	const channels = ctx.destination.channelCount
	const sampleRate = ctx.sampleRate

	const LO = new AudioBuffer({
		length: 1024,
		numberOfChannels: channels,
		sampleRate
	})
	const HI = createOscillator({
		type: 'sine', channels, sampleRate
	})(1024) // todo: adjust length to interval

	const signals = []
	let t = 0, signal = null, paused = true, end = false

	// todo: non-objectMode, backpressure
	const receive = (signal, _, cb) => {
		signals.push(signal)
		if (paused && !end) setTimeout(send, 0, null, null)
		cb()
	}
	const incoming = new Writable({objectMode: true, write: receive})
	incoming.on('finish', () => {
		end = true
	})

	const speaker = createSpeaker() // todo: use ctx
	const send = (err) => {
		if (err === true) return // end
		if (err) return console.error(err)

		const n = Date.now()
		if ((n - t) >= interval) {
			t = n
			if (signals.length === 0) {
				if (end) speaker(null)
				else paused = true
				return
			}
			signal = signals.shift()
		}

		paused = false
		speaker(signal ? HI : LO, send)
	}

	return incoming
}

// const maxFreq = Math.round(ctx.sampleRate / 2) - 300
// const minFreq = 19000
// if ((maxFreq - minFreq) < 100) throw new Error('frequency bandwidth too small')

module.exports = createSender
