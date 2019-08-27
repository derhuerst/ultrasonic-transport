'use strict'

const {randomBytes} = require('crypto')
const pump = require('pump')
const test = require('tape')
const {
	fromBuf, toBuf,
	pcmEncoder, pcmDecoder
} = require('./test-helpers')
const {encoder, decoder} = require('.')

test('encoding -> decoding works without noise', (t) => {
	// const input = randomBytes(100)
	const input = Buffer.from('abcde', 'utf-8')
	const output = Buffer.alloc(input.byteLength)

	pump(
		fromBuf(input),
		encoder(), pcmEncoder(),
		pcmDecoder(), decoder(),
		toBuf(output),
		(err) => {
			t.ifError(err)
			t.equal(output.toString('hex'), input.toString('hex'))
			t.end()
		}
	)
})
