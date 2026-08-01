package main

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestFeedMatchesIgnoresGenerationTime(t *testing.T) {
	issues := []FeedIssue{{ID: "example/project#1", Repository: "example/project", Number: 1}}
	existing := Feed{
		GeneratedAt: time.Now().Add(-time.Hour),
		Profile:     "Tester",
		Total:       len(issues),
		Issues:      issues,
	}
	contents, err := json.Marshal(existing)
	if err != nil {
		t.Fatal(err)
	}
	path := filepath.Join(t.TempDir(), "feed.json")
	if err := os.WriteFile(path, contents, 0o600); err != nil {
		t.Fatal(err)
	}

	if !feedMatches(path, "Tester", issues) {
		t.Fatal("expected identical issue content to match")
	}
	if feedMatches(path, "Someone else", issues) {
		t.Fatal("expected a different profile not to match")
	}
}
