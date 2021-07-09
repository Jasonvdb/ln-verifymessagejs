
import * as secp from "noble-secp256k1";
import { zbase32 } from "./zbase";
const sjcl = require('sjcl');

/**
 * Algorithm according to https://twitter.com/rusty_twit/status/1182102005914800128
 * zbase32(SigRec(SHA256(SHA256("Lightning Signed Message:" + msg))))
 */


function bytesToBigInt(bytes: Uint8Array): bigint {
    var hex = [];
    bytes.forEach(function (i) {
      var h = i.toString(16);
      if (h.length % 2) { h = '0' + h; }
      hex.push(h);
    });
    return BigInt('0x' + hex.join(''));
  }

function decodeZbase(zbase: string): [Uint8Array, number] {
    const signedMessage = zbase32.decode(zbase);
    const recoveryId = signedMessage[0] - 31;
    const signature = signedMessage.slice(1, 65);
    return [signature, recoveryId];
}

function getSignature(signatureBytes: Uint8Array): secp.Signature {
    const r = bytesToBigInt(signatureBytes.slice(0,32));
    const s = bytesToBigInt(signatureBytes.slice(32, 64));
    const signature = new secp.Signature(r, s);
    return signature
}

function getMessageHash(message: string) {
    const messageWithPrefix = "Lightning Signed Message:" + message;
    const dsha256 = sjcl.hash.sha256.hash(sjcl.hash.sha256.hash(messageWithPrefix));
    return sjcl.codec.hex.fromBits(dsha256)
}


export function deriveNodeId(zbase: string, message: string) {
    try {
        const [signatureBytes, recoveryId] = decodeZbase(zbase);
        const signature = getSignature(signatureBytes);
        signature.assertValidity();

        const messageHash = getMessageHash(message);
    
        const point = secp.Point.fromSignature(messageHash, signature, recoveryId);
        point.assertValidity();

        const nodeId = point.toHex(true);
        return nodeId;
    } catch (e) {
        return undefined;
    }
}





