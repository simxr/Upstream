package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"reflect"
	"time"
)

func main() {
	configDir := flag.String("config-dir", "config", "directory containing Upstream YAML configuration")
	output := flag.String("output", "data/feed.json", "path for the generated JSON feed")
	apiURL := flag.String("github-api-url", envOrDefault("GITHUB_API_URL", "https://api.github.com"), "GitHub API base URL")
	flag.Parse()

	if err := run(*configDir, *output, *apiURL, os.Getenv("GITHUB_TOKEN")); err != nil {
		fmt.Fprintln(os.Stderr, "upstream:", err)
		os.Exit(1)
	}
}

func run(configDir, output, apiURL, token string) error {
	config, err := loadConfig(configDir)
	if err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(context.Background(), 8*time.Minute)
	defer cancel()

	client := newGitHubClient(apiURL, token)
	candidates, err := client.fetchCandidates(ctx, config.Repositories)
	if err != nil {
		return err
	}
	issues := scoreCandidates(candidates, config)
	checkedAt := time.Now().UTC().Truncate(time.Second)
	previous, _ := readFeed(output)
	contentUnchanged := feedContentMatches(previous, config.Profile.Name, issues)
	changedAt := resolveChangedAt(previous, contentUnchanged, checkedAt)
	feed := Feed{
		CheckedAt: checkedAt,
		ChangedAt: changedAt,
		Profile:   config.Profile.Name,
		Total:     len(issues),
		Issues:    issues,
	}

	contents, err := json.MarshalIndent(feed, "", "  ")
	if err != nil {
		return fmt.Errorf("encode feed: %w", err)
	}
	contents = append(contents, '\n')
	if err := writeAtomically(output, contents); err != nil {
		return err
	}
	if contentUnchanged {
		fmt.Printf("checked feed at %s; ranked issue content is unchanged\n", checkedAt.Format(time.RFC3339))
	} else {
		fmt.Printf("wrote %d ranked issues to %s\n", len(issues), output)
	}
	return nil
}

func readFeed(path string) (Feed, error) {
	contents, err := os.ReadFile(path)
	if err != nil {
		return Feed{}, err
	}
	var existing Feed
	if err := json.Unmarshal(contents, &existing); err != nil {
		return Feed{}, err
	}
	return existing, nil
}

func feedContentMatches(existing Feed, profile string, issues []FeedIssue) bool {
	return existing.Profile == profile && reflect.DeepEqual(existing.Issues, issues)
}

func resolveChangedAt(previous Feed, contentUnchanged bool, checkedAt time.Time) time.Time {
	if !contentUnchanged {
		return checkedAt
	}
	if !previous.ChangedAt.IsZero() {
		return previous.ChangedAt
	}
	if previous.LegacyGeneratedAt != nil {
		return *previous.LegacyGeneratedAt
	}
	return checkedAt
}

func writeAtomically(path string, contents []byte) error {
	dir := filepath.Dir(path)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return fmt.Errorf("create output directory: %w", err)
	}
	temporary, err := os.CreateTemp(dir, ".feed-*.json")
	if err != nil {
		return fmt.Errorf("create temporary feed: %w", err)
	}
	temporaryPath := temporary.Name()
	defer os.Remove(temporaryPath)

	if _, err := temporary.Write(contents); err != nil {
		temporary.Close()
		return fmt.Errorf("write temporary feed: %w", err)
	}
	if err := temporary.Close(); err != nil {
		return fmt.Errorf("close temporary feed: %w", err)
	}
	if err := os.Rename(temporaryPath, path); err != nil {
		return fmt.Errorf("replace feed: %w", err)
	}
	return nil
}

func envOrDefault(name, fallback string) string {
	if value := os.Getenv(name); value != "" {
		return value
	}
	return fallback
}
