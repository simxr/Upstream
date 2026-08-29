package main

import (
	"context"
	"fmt"
	"regexp"
	"sort"
	"strconv"
	"time"
)

var (
	linkedIssueURLPattern = regexp.MustCompile(`(?i)(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+https://github\.com/([^/]+/[^/]+)/issues/(\d+)`)
	linkedIssuePattern    = regexp.MustCompile(`(?i)(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+#(\d+)`)
)

func buildJourney(ctx context.Context, client *GitHubClient, config Config, generatedAt time.Time) (Journey, error) {
	entries := make([]JourneyEntry, 0)
	shapeByAlias := shapeAliases(config.Shapes)
	for _, repository := range config.Repositories.Repositories {
		pullRequests, err := client.searchMergedPullRequests(ctx, repository.Repo, config.Profile.GitHubUsername)
		if err != nil {
			return Journey{}, fmt.Errorf("fetch merged pull requests for %s: %w", repository.Repo, err)
		}
		for _, pullRequest := range pullRequests {
			mergedAt := pullRequest.UpdatedAt
			if pullRequest.PullRequest != nil && pullRequest.PullRequest.MergedAt != nil {
				mergedAt = *pullRequest.PullRequest.MergedAt
			}
			entries = append(entries, JourneyEntry{
				Kind:        "merged_pr",
				Repository:  repository.Repo,
				Number:      pullRequest.Number,
				URL:         pullRequest.HTMLURL,
				Title:       pullRequest.Title,
				DomainTags:  sortedCopy(repository.Domains),
				ShapeTags:   inferShapes(pullRequest.Labels, shapeByAlias),
				State:       "merged",
				OccurredAt:  mergedAt,
				LinkedIssue: linkedIssueFromBody(repository.Repo, pullRequest.Body),
			})
		}

		issues, err := client.searchAuthoredIssues(ctx, repository.Repo, config.Profile.GitHubUsername)
		if err != nil {
			return Journey{}, fmt.Errorf("fetch authored issues for %s: %w", repository.Repo, err)
		}
		for _, issue := range issues {
			entries = append(entries, JourneyEntry{
				Kind:       "opened_issue",
				Repository: repository.Repo,
				Number:     issue.Number,
				URL:        issue.HTMLURL,
				Title:      issue.Title,
				DomainTags: sortedCopy(repository.Domains),
				ShapeTags:  inferShapes(issue.Labels, shapeByAlias),
				State:      issue.State,
				OccurredAt: issue.CreatedAt,
			})
		}
	}

	sort.SliceStable(entries, func(left, right int) bool {
		return entries[left].OccurredAt.After(entries[right].OccurredAt)
	})
	return Journey{
		GeneratedAt:    generatedAt,
		Name:           config.Profile.Name,
		Slug:           config.Profile.Slug,
		GitHubUsername: config.Profile.GitHubUsername,
		Entries:        entries,
	}, nil
}

func linkedIssueFromBody(repository, body string) string {
	if match := linkedIssueURLPattern.FindStringSubmatch(body); len(match) == 3 {
		return match[1] + "#" + match[2]
	}
	if match := linkedIssuePattern.FindStringSubmatch(body); len(match) == 2 {
		if _, err := strconv.Atoi(match[1]); err == nil {
			return repository + "#" + match[1]
		}
	}
	return ""
}
