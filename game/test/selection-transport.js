const {deflateSync, inflateSync} = require('node:zlib');

const PREFIX = 'brasswake-plan-z1:';
// Stay below Linux's per-environment-entry limit, including the variable name.
const MAX_ENCODED_BYTES = 96 * 1024;
const MAX_DECODED_BYTES = 4 * 1024 * 1024;

function encodeSelection(plan) {
  const json = JSON.stringify(plan);
  if (typeof json !== 'string' || Buffer.byteLength(json) > MAX_DECODED_BYTES)
    throw Error('Verification plan exceeds the uncompressed size limit.');
  const encoded = PREFIX + deflateSync(json).toString('base64');
  if (encoded.length > MAX_ENCODED_BYTES)
    throw Error('Verification plan exceeds the Actions transport size limit.');
  return encoded;
}

function decodeSelection(value) {
  if (typeof value !== 'string') throw Error('Missing verification plan.');
  if (!value.startsWith(PREFIX)) {
    if (Buffer.byteLength(value) > MAX_DECODED_BYTES)
      throw Error('Verification plan exceeds the uncompressed size limit.');
    return JSON.parse(value);
  }
  if (value.length > MAX_ENCODED_BYTES)
    throw Error('Verification plan exceeds the Actions transport size limit.');
  const payload = value.slice(PREFIX.length);
  if (!payload || payload.length % 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(payload))
    throw Error('Invalid compressed verification plan encoding.');
  const bytes = Buffer.from(payload, 'base64');
  if (bytes.toString('base64') !== payload)
    throw Error('Invalid compressed verification plan encoding.');
  const {buffer, engine} = inflateSync(bytes, {maxOutputLength: MAX_DECODED_BYTES, info: true});
  if (engine.bytesWritten !== bytes.length) throw Error('Trailing bytes in compressed verification plan.');
  return JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(buffer));
}

module.exports = {encodeSelection, decodeSelection, PREFIX, MAX_ENCODED_BYTES, MAX_DECODED_BYTES};
