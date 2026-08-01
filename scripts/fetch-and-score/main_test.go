package main

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestFeedContentMatchesIgnoresRefreshTimes(t *testing.T) {
	issues := []FeedIssue{{ID: "example/project#1", Repository: "example/project", Number: 1}}
	existing := Feed{
		CheckedAt: time.Now(),
		ChangedAt: time.Now().Add(-time.Hour),
		Profile:   "Tester",
		Total:     len(issues),
		Issues:    issues,
	}
	contents, err := json.Marshal(existing)
	if err != nil {
		t.Fatal(err)
	}
	path := filepath.Join(t.TempDir(), "feed.json")
	if err := os.WriteFile(path, contents, 0o600); err != nil {
		t.Fatal(err)
	}

	loaded, err := readFeed(path)
	if err != nil {
		t.Fatal(err)
	}
	if !feedContentMatches(loaded, "Tester", issues) {
		t.Fatal("expected identical issue content to match")
	}
	if feedContentMatches(loaded, "Someone else", issues) {
		t.Fatal("expected a different profile not to match")
	}
}

func TestResolveChangedAtPreservesPreviousChangeTime(t *testing.T) {
	checkedAt := time.Date(2026, time.August, 2, 3, 17, 0, 0, time.UTC)
	changedAt := checkedAt.Add(-12 * time.Hour)
	previous := Feed{ChangedAt: changedAt}

	if got := resolveChangedAt(previous, true, checkedAt); !got.Equal(changedAt) {
		t.Fatalf("expected unchanged feed to preserve %s, got %s", changedAt, got)
	}
	if got := resolveChangedAt(previous, false, checkedAt); !got.Equal(checkedAt) {
		t.Fatalf("expected changed feed to use check time %s, got %s", checkedAt, got)
	}
}

func TestResolveChangedAtMigratesLegacyGeneratedAt(t *testing.T) {
	checkedAt := time.Date(2026, time.August, 2, 3, 17, 0, 0, time.UTC)
	legacyGeneratedAt := checkedAt.Add(-24 * time.Hour)
	previous := Feed{LegacyGeneratedAt: &legacyGeneratedAt}

	if got := resolveChangedAt(previous, true, checkedAt); !got.Equal(legacyGeneratedAt) {
		t.Fatalf("expected legacy generation time %s, got %s", legacyGeneratedAt, got)
	}
}
