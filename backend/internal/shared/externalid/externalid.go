package externalid

import (
	"errors"
	"math/big"
	"net/url"
	"strings"

	"github.com/google/uuid"
)

const Alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"

var (
	ErrInvalidExternalID = errors.New("invalid external id")
	base58Radix          = big.NewInt(58)
)

var decodeTable = func() [256]int {
	table := [256]int{}
	for i := range table {
		table[i] = -1
	}
	for index, char := range []byte(Alphabet) {
		table[char] = index
	}
	return table
}()

func EncodeUUIDString(value string) (string, error) {
	parsed, err := uuid.Parse(value)
	if err != nil {
		return "", ErrInvalidExternalID
	}
	return encodeBytes(parsed[:]), nil
}

func MustEncodeUUIDString(value string) string {
	encoded, err := EncodeUUIDString(value)
	if err != nil {
		panic(err)
	}
	return encoded
}

func MaybeEncodeUUIDString(value string) string {
	encoded, err := EncodeUUIDString(value)
	if err != nil {
		return value
	}
	return encoded
}

func DecodeToUUIDString(value string) (string, error) {
	raw, err := decodeBytes(strings.TrimSpace(value))
	if err != nil {
		return "", ErrInvalidExternalID
	}
	if len(raw) != 16 {
		return "", ErrInvalidExternalID
	}

	parsed, err := uuid.FromBytes(raw)
	if err != nil {
		return "", ErrInvalidExternalID
	}

	if encodeBytes(parsed[:]) != value {
		return "", ErrInvalidExternalID
	}

	return parsed.String(), nil
}

func RewriteURLPathUUIDs(value string) string {
	if value == "" {
		return ""
	}
	if !strings.Contains(value, "/") {
		return value
	}

	parsed, err := url.Parse(value)
	if err != nil {
		return rewritePathSegments(value)
	}

	parsed.Path = rewritePathSegments(parsed.Path)
	return parsed.String()
}

func encodeBytes(source []byte) string {
	if len(source) == 0 {
		return ""
	}

	leadingZeroes := 0
	for leadingZeroes < len(source) && source[leadingZeroes] == 0 {
		leadingZeroes++
	}

	value := new(big.Int).SetBytes(source)
	if value.Sign() == 0 {
		return strings.Repeat("1", leadingZeroes)
	}

	var encoded []byte
	mod := new(big.Int)
	for value.Sign() > 0 {
		value.DivMod(value, base58Radix, mod)
		encoded = append(encoded, Alphabet[mod.Int64()])
	}
	for i := 0; i < leadingZeroes; i++ {
		encoded = append(encoded, '1')
	}

	reverseBytes(encoded)
	return string(encoded)
}

func decodeBytes(value string) ([]byte, error) {
	if value == "" {
		return nil, ErrInvalidExternalID
	}

	leadingZeroes := 0
	for leadingZeroes < len(value) && value[leadingZeroes] == '1' {
		leadingZeroes++
	}

	total := big.NewInt(0)
	for i := 0; i < len(value); i++ {
		index := decodeTable[value[i]]
		if index < 0 {
			return nil, ErrInvalidExternalID
		}
		total.Mul(total, base58Radix)
		total.Add(total, big.NewInt(int64(index)))
	}

	decoded := total.Bytes()
	if leadingZeroes > 0 {
		decoded = append(make([]byte, leadingZeroes), decoded...)
	}
	return decoded, nil
}

func rewritePathSegments(value string) string {
	if value == "" {
		return ""
	}

	segments := strings.Split(value, "/")
	for index, segment := range segments {
		segments[index] = MaybeEncodeUUIDString(segment)
	}
	return strings.Join(segments, "/")
}

func reverseBytes(values []byte) {
	for left, right := 0, len(values)-1; left < right; left, right = left+1, right-1 {
		values[left], values[right] = values[right], values[left]
	}
}
