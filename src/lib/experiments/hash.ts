import { MurmurHash3 } from "./constants";

/// MurmurHash3 (x86, 32-bit) — the same family Discord and Split.io use for
/// consistent bucketing. Implemented inline to avoid a runtime dependency and
/// keep cross-bot assignment fully deterministic.
///
/// Equivalent to `murmurhash.v3(key)` from the `murmurhash` npm package.
export function murmurHash3(key: string, seed = 0): number {
	const remainder = key.length & 3;
	const bytes = key.length - remainder;

	let h1 = seed;
	let i = 0;

	while (i < bytes) {
		let k1 =
			(key.charCodeAt(i) & MurmurHash3.ByteMask) |
			((key.charCodeAt(++i) & MurmurHash3.ByteMask) << 8) |
			((key.charCodeAt(++i) & MurmurHash3.ByteMask) << 16) |
			((key.charCodeAt(++i) & MurmurHash3.ByteMask) << 24);
		++i;

		k1 = Math.imul(k1, MurmurHash3.C1);
		k1 = (k1 << 15) | (k1 >>> 17);
		k1 = Math.imul(k1, MurmurHash3.C2);

		h1 ^= k1;
		h1 = (h1 << 13) | (h1 >>> 19);
		h1 = (Math.imul(h1, 5) + MurmurHash3.Mix) | 0;
	}

	let k1 = 0;
	switch (remainder) {
		case 3:
			k1 ^= (key.charCodeAt(i + 2) & MurmurHash3.ByteMask) << 16;
		// falls through
		case 2:
			k1 ^= (key.charCodeAt(i + 1) & MurmurHash3.ByteMask) << 8;
		// falls through
		case 1:
			k1 ^= key.charCodeAt(i) & MurmurHash3.ByteMask;
			k1 = Math.imul(k1, MurmurHash3.C1);
			k1 = (k1 << 15) | (k1 >>> 17);
			k1 = Math.imul(k1, MurmurHash3.C2);
			h1 ^= k1;
	}

	h1 ^= key.length;
	h1 ^= h1 >>> 16;
	h1 = Math.imul(h1, MurmurHash3.FMix1);
	h1 ^= h1 >>> 13;
	h1 = Math.imul(h1, MurmurHash3.FMix2);
	h1 ^= h1 >>> 16;

	return h1 >>> 0;
}

/// Computes a deterministic bucket position in `[0, 9999]` for an entity in an
/// experiment, matching Discord's `MurmurHash3(key:entityId) % 10000`.
export function computePosition(
	experimentKey: string,
	entityId: string,
): number {
	return murmurHash3(`${experimentKey}:${entityId}`) % 10_000;
}
