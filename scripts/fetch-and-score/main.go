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
	journeyOutput := flag.String("journey-output", "data/journey.json", "path for the generated contribution journey")
	apiURL := flag.String("github-api-url", envOrDefault("GITHUB_API_URL", "https://api.github.com"), "GitHub API base URL")
	flag.Parse()

	if err := run(*configDir, *output, *journeyOutput, *apiURL, os.Getenv("GITHUB_TOKEN")); err != nil {
		fmt.Fprintln(os.Stderr, "upstream:", err)
		os.Exit(1)
	}
}

func run(configDir, output, journeyOutput, apiURL, token string) error {
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
	profileTags := profileTagLabels(config.Profile)
	checkedAt := time.Now().UTC().Truncate(time.Second)
	journey, err := buildJourney(ctx, client, config, checkedAt)
	if err != nil {
		return err
	}
	previous, _ := readFeed(output)
	contentUnchanged := feedContentMatches(previous, config.Profile.Name, config.Profile.Slug, profileTags, issues)
	changedAt := resolveChangedAt(previous, contentUnchanged, checkedAt)
	feed := Feed{
		CheckedAt:   checkedAt,
		ChangedAt:   changedAt,
		Profile:     config.Profile.Name,
		ProfileSlug: config.Profile.Slug,
		ProfileTags: profileTags,
		Total:       len(issues),
		Issues:      issues,
	}

	contents, err := json.MarshalIndent(feed, "", "  ")
	if err != nil {
		return fmt.Errorf("encode feed: %w", err)
	}
	contents = append(contents, '\n')
	journeyContents, err := json.MarshalIndent(journey, "", "  ")
	if err != nil {
		return fmt.Errorf("encode journey: %w", err)
	}
	journeyContents = append(journeyContents, '\n')
	if err := writeAtomically(output, contents); err != nil {
		return err
	}
	if err := writeAtomically(journeyOutput, journeyContents); err != nil {
		return err
	}
	if contentUnchanged {
		fmt.Printf("checked feed at %s; ranked issue content is unchanged\n", checkedAt.Format(time.RFC3339))
	} else {
		fmt.Printf("wrote %d ranked issues to %s\n", len(issues), output)
	}
	fmt.Printf("wrote %d merged pull requests to %s\n", len(journey.Entries), journeyOutput)
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

func feedContentMatches(existing Feed, profile, profileSlug string, profileTags []string, issues []FeedIssue) bool {
	return existing.Profile == profile &&
		existing.ProfileSlug == profileSlug &&
		reflect.DeepEqual(existing.ProfileTags, profileTags) &&
		reflect.DeepEqual(existing.Issues, issues)
}

func profileTagLabels(profile Profile) []string {
	labels := make([]string, 0, len(profile.Skills))
	for _, skill := range profile.Skills {
		if skill.Label != "" {
			labels = append(labels, skill.Label)
		}
	}
	return uniqueSorted(labels)
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
