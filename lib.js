'use strict'

const roundPower2 = x => Math.pow(2, Math.round(Math.log2(x)))

const defaults = {
	sampleRate: 44100,
	minFreq: 2000,
	maxFreq: 3000,
	freqInterval: 200
}
const profile = (opt = {}) => {
	const {sampleRate, minFreq, maxFreq, freqInterval} = {...defaults, ...opt}
	const steps = (maxFreq - minFreq) / freqInterval | 0
	return {
		sampleRate,
		minFreq,
		maxFreq: minFreq + freqInterval * steps,
		freqInterval,
		// We need enough resolution to tell frequencies apart.
		ftSize: roundPower2(sampleRate / freqInterval * 4)
	}
}

// todo: use a lib?
const fadeInFadeOut = audioBuf => {
	const {sampleRate, length, numberOfChannels} = audioBuf
	const n = Math.round(Math.min(sampleRate / 1000, length / 10))

	for (let c = 0; c < numberOfChannels; c++) {
		const d = audioBuf.getChannelData(c)
		for (let i = 0; i < n; i++) {
			d[i] *= i / n
			d[length - 1 - i] *= i / n
		}
	}
}

module.exports = {
	roundPower2,
	profile,
	fadeInFadeOut
}
