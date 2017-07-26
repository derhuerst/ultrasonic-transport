'use strict'

const getAudioContext = require('audio-context')
const fromArray = require('from2-array') // todo: remove
const Writable = require('readable-stream/writable')
// const generator = require('audio-generator/stream')
// const duplexify = require('duplexify')
const createOscillator = require('audio-oscillator')
// const through2 = require('through2')
// const AudioThrough = require('audio-through')
// const audioWritable = require('web-audio-stream/stream').Writable
const createSpeaker = require('audio-speaker/direct')

// const createSender = (interval) => {
// 	const incoming = new Writable({objectMode: true}) // todo: non-objectMode
// 	// todo: backpressure

// 	const queue = []
// 	let lastShift = 0

// 	const outgoing = generator((t) => {
// 		if ((t - lastShift) >= interval) {
// 			console.error('next')
// 			queue.shift()
// 			lastShift = t
// 		}
// 		if (queue.length === 0) return 0
// 		const x = queue[0]
// 		return x ? Math.sin(440 * t * Math.PI * 2) : 0
// 	})

// 	return duplexify.obj(incoming, outgoing)
// }

const createSender = (ctx, interval) => {
	const channels = ctx.destination.channelCount
	const sampleRate = ctx.sampleRate

	const sine = createOscillator({
		type: 'sine', channels, sampleRate
	})

	const signals = []
	let t = 0, signal = null, paused = true, end = false

	// todo: non-objectMode, backpressure
	const receive = (signal, _, cb) => {
		signals.push(signal)
		if (paused && !end) {
			console.log('play')
			setTimeout(send, 0, null, null)
		}
		cb()
	}
	const incoming = new Writable({objectMode: true, write: receive})
	incoming.on('end', () => {
		console.log('going to end')
		end = true
	})

	const speaker = createSpeaker() // todo: use ctx
	const send = (err, buf) => { // todo: use buf
		if (err === true) return
		if (err) return console.error(err)

		const n = Date.now()
		console.log('in', signals.length, signal, n - t)
		if ((n - t) >= interval) {
			t = n
			if (signals.length === 0) {
				if (end) {
					console.log('ending now')
					speaker.end()
				} else {
					console.log('pause')
					paused = true
				}
				return
			}
			console.log('new signal!')
			signal = signals.shift()
		}

		console.log('out', signals.length, signal)
		// todo: mute if signal is false
		// const length = Math.floor(sampleRate * interval / 1000)
		const length = 1024
		speaker(sine(length), send)
	}

	return incoming
}

const ctx = getAudioContext()
const interval = 500

// const maxFreq = Math.round(ctx.sampleRate / 2) - 300
// const minFreq = 19000
// if ((maxFreq - minFreq) < 100) throw new Error('frequency bandwidth too small')

const sender = createSender(ctx, interval)
.on('error', console.error)

const data = [
	true, false, true, true,	false, false, false,
	// true, false, true, true,	false, false, false,
	// true, false, true, true,	false, false, false,
	// true, false, true, true,	false, false, false,
	// true, false, true, true,	false, false, false
]

for (let v of data) sender.write(v)
setTimeout(() => {
	sender.write(true)
	sender.write(false)
	sender.write(true)
	sender.end()
}, 7000)
