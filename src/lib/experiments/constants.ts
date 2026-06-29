/// MurmurHash3 (x86, 32-bit) magic constants.
///
/// Expressed as decimals because the formatter (oxfmt) lowercases hex digits
/// while the linter (unicorn/number-literal-case) requires uppercase — decimals
/// avoid that conflict. Hex equivalents kept for reference below.
///
/// Declared as a `const enum` (not a standard `enum`) because these values are
/// only consumed internally by the hash implementation, so they are inlined at
/// compile time and add no runtime cost to the hot bucketing loop.
// oxlint-disable-next-line no-restricted-syntax
export const enum MurmurHash3 {
	/// 0xcc9e2d51
	C1 = 3432918353,
	/// 0x1b873593
	C2 = 461845907,
	/// 0xe6546b64
	Mix = 3864292196,
	/// 0x85ebca6b
	FMix1 = 2246822507,
	/// 0xc2b2ae35
	FMix2 = 3266489909,
	/// 0xff
	ByteMask = 255,
}
