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

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Minute)
	defer cancel()

	client := newGitHubClient(apiURL, token)
	candidates, err := client.fetchCandidates(ctx, config.Repositories)
	if err != nil {
		return err
	}
	issues := scoreCandidates(candidates, config)
	if feedMatches(output, config.Profile.Name, issues) {
		fmt.Printf("feed is unchanged at %s\n", output)
		return nil
	}
	feed := Feed{
		GeneratedAt: time.Now().UTC().Truncate(time.Second),
		Profile:     config.Profile.Name,
		Total:       len(issues),
		Issues:      issues,
	}

	contents, err := json.MarshalIndent(feed, "", "  ")
	if err != nil {
		return fmt.Errorf("encode feed: %w", err)
	}
	contents = append(contents, '\n')
	if err := writeAtomically(output, contents); err != nil {
		return err
	}
	fmt.Printf("wrote %d ranked issues to %s\n", len(issues), output)
	return nil
}

func feedMatches(path, profile string, issues []FeedIssue) bool {
	contents, err := os.ReadFile(path)
	if err != nil {
		return false
	}
	var existing Feed
	if err := json.Unmarshal(contents, &existing); err != nil {
		return false
	}
	return existing.Profile == profile && reflect.DeepEqual(existing.Issues, issues)
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
