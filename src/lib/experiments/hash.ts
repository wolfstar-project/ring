// MurmurHash3 constants, expressed as decimals because the formatter (oxfmt)
// lowercases hex digits while the linter (unicorn/number-literal-case) requires
// uppercase — decimals avoid that conflict. Hex equivalents kept for reference:
//   C1 = 0xcc9e2d51, C2 = 0x1b873593, MIX = 0xe6546b64,
//   FMIX1 = 0x85ebca6b, FMIX2 = 0xc2b2ae35, BYTE_MASK = 0xff
const C1 = 3432918353;
const C2 = 461845907;
const MIX = 3864292196;
const FMIX1 = 2246822507;
const FMIX2 = 3266489909;
const BYTE_MASK = 255;

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
			(key.charCodeAt(i) & BYTE_MASK) |
			((key.charCodeAt(++i) & BYTE_MASK) << 8) |
			((key.charCodeAt(++i) & BYTE_MASK) << 16) |
			((key.charCodeAt(++i) & BYTE_MASK) << 24);
		++i;

		k1 = Math.imul(k1, C1);
		k1 = (k1 << 15) | (k1 >>> 17);
		k1 = Math.imul(k1, C2);

		h1 ^= k1;
		h1 = (h1 << 13) | (h1 >>> 19);
		h1 = (Math.imul(h1, 5) + MIX) | 0;
	}

	let k1 = 0;
	switch (remainder) {
		case 3:
			k1 ^= (key.charCodeAt(i + 2) & BYTE_MASK) << 16;
		// falls through
		case 2:
			k1 ^= (key.charCodeAt(i + 1) & BYTE_MASK) << 8;
		// falls through
		case 1:
			k1 ^= key.charCodeAt(i) & BYTE_MASK;
			k1 = Math.imul(k1, C1);
			k1 = (k1 << 15) | (k1 >>> 17);
			k1 = Math.imul(k1, C2);
			h1 ^= k1;
	}

	h1 ^= key.length;
	h1 ^= h1 >>> 16;
	h1 = Math.imul(h1, FMIX1);
	h1 ^= h1 >>> 13;
	h1 = Math.imul(h1, FMIX2);
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
