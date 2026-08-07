package app

import (
	"testing"
	"time"
)

func TestDatabaseTimestampEqualUsesPostgresPrecision(t *testing.T) {
	actual := time.Date(2026, time.August, 7, 14, 30, 0, 123456000, time.UTC)
	if !databaseTimestampEqual(actual, actual.Add(789*time.Nanosecond)) {
		t.Fatal("sub-microsecond serialization drift caused a false conflict")
	}
	if databaseTimestampEqual(actual, actual.Add(time.Microsecond)) {
		t.Fatal("a genuinely different database timestamp was accepted")
	}
}
