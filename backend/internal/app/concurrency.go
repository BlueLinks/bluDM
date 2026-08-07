package app

import "time"

// databaseTimestampEqual accounts for PostgreSQL's microsecond timestamp
// precision while still rejecting genuinely stale authoring writes.
func databaseTimestampEqual(actual, expected time.Time) bool {
	return actual.Truncate(time.Microsecond).Equal(expected.Truncate(time.Microsecond))
}
