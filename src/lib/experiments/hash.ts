/// MurmurHash3 (x86, 32-bit) — the same family Discord and Split.io use for
/// consistent bucketing. Implemented inline to avoid a runtime dependency and
/// keep cross-bot assignment fully deterministic.
///
/// Equivalent to `murmurhash.v3(key)` from the `murmurhash` npm package.
export function murmurHash3(key: string, seed = 0): number {
	const remainder = key.length & 3;
	const bytes = key.length - remainder;
	const c1 = 0xcc9e2d51;
	const c2 = 0x1b873593;

	let h1 = seed;
	let i = 0;

	while (i < bytes) {
		let k1 =
			(key.charCodeAt(i) & 0xff) |
			((key.charCodeAt(++i) & 0xff) << 8) |
			((key.charCodeAt(++i) & 0xff) << 16) |
			((key.charCodeAt(++i) & 0xff) << 24);
		++i;

		k1 = Math.imul(k1, c1);
		k1 = (k1 << 15) | (k1 >>> 17);
		k1 = Math.imul(k1, c2);

		h1 ^= k1;
		h1 = (h1 << 13) | (h1 >>> 19);
		h1 = (Math.imul(h1, 5) + 0xe6546b64) | 0;
	}

	let k1 = 0;
	switch (remainder) {
		case 3:
			k1 ^= (key.charCodeAt(i + 2) & 0xff) << 16;
		// falls through
		case 2:
			k1 ^= (key.charCodeAt(i + 1) & 0xff) << 8;
		// falls through
		case 1:
			k1 ^= key.charCodeAt(i) & 0xff;
			k1 = Math.imul(k1, c1);
			k1 = (k1 << 15) | (k1 >>> 17);
			k1 = Math.imul(k1, c2);
			h1 ^= k1;
	}

	h1 ^= key.length;
	h1 ^= h1 >>> 16;
	h1 = Math.imul(h1, 0x85ebca6b);
	h1 ^= h1 >>> 13;
	h1 = Math.imul(h1, 0xc2b2ae35);
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
