package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

const maxSearchPages = 10
const maxRateLimitRetries = 2

type searchResponse struct {
	TotalCount int           `json:"total_count"`
	Items      []GitHubIssue `json:"items"`
}

type GitHubClient struct {
	BaseURL    string
	Token      string
	HTTPClient *http.Client
}

func newGitHubClient(baseURL, token string) *GitHubClient {
	return &GitHubClient{
		BaseURL: strings.TrimRight(baseURL, "/"),
		Token:   token,
		HTTPClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

func (client *GitHubClient) fetchCandidates(ctx context.Context, config RepositoriesConfig) ([]Candidate, error) {
	repositories := make(map[string]Repository, len(config.Repositories))
	for _, repository := range config.Repositories {
		repositories[strings.ToLower(repository.Repo)] = repository
	}

	issues, err := client.searchIssues(ctx, config)
	if err != nil {
		return nil, err
	}
	candidates := make([]Candidate, 0, len(issues))
	for _, issue := range issues {
		repositoryName := repositoryNameFromAPIURL(issue.RepositoryURL)
		repository, ok := repositories[strings.ToLower(repositoryName)]
		if !ok {
			return nil, fmt.Errorf("GitHub returned issue from repository outside allowlist: %q", repositoryName)
		}
		candidates = append(candidates, Candidate{Issue: issue, Repository: repository})
	}
	return candidates, nil
}

func (client *GitHubClient) searchIssues(ctx context.Context, config RepositoriesConfig) ([]GitHubIssue, error) {
	labelValues := make([]string, 0, len(config.DiscoveryLabels))
	for _, label := range config.DiscoveryLabels {
		labelValues = append(labelValues, strconv.Quote(label))
	}

	var issues []GitHubIssue
	for _, repository := range config.Repositories {
		repositoryIssues, err := client.searchRepository(ctx, repository, labelValues)
		if err != nil {
			return nil, err
		}
		issues = append(issues, repositoryIssues...)
	}
	return issues, nil
}

func (client *GitHubClient) searchRepository(ctx context.Context, repository Repository, labelValues []string) ([]GitHubIssue, error) {
	query := fmt.Sprintf(
		"repo:%s is:issue is:open label:%s",
		repository.Repo,
		strings.Join(labelValues, ","),
	)

	var issues []GitHubIssue
	for page := 1; page <= maxSearchPages; page++ {
		parameters := url.Values{}
		parameters.Set("q", query)
		parameters.Set("sort", "updated")
		parameters.Set("order", "desc")
		parameters.Set("per_page", "100")
		parameters.Set("page", strconv.Itoa(page))
		endpoint := client.BaseURL + "/search/issues?" + parameters.Encode()

		request, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
		if err != nil {
			return nil, err
		}
		request.Header.Set("Accept", "application/vnd.github+json")
		request.Header.Set("X-GitHub-Api-Version", "2022-11-28")
		request.Header.Set("User-Agent", "upstream-feed-generator")
		if client.Token != "" {
			request.Header.Set("Authorization", "Bearer "+client.Token)
		}

		response, err := client.doWithRateLimit(ctx, request)
		if err != nil {
			return nil, err
		}
		body, readErr := io.ReadAll(io.LimitReader(response.Body, 10<<20))
		closeErr := response.Body.Close()
		if readErr != nil {
			return nil, readErr
		}
		if closeErr != nil {
			return nil, closeErr
		}
		if response.StatusCode != http.StatusOK {
			return nil, fmt.Errorf(
				"GitHub returned %s (rate remaining=%s, reset=%s): %s",
				response.Status,
				response.Header.Get("X-RateLimit-Remaining"),
				response.Header.Get("X-RateLimit-Reset"),
				strings.TrimSpace(string(body)),
			)
		}

		var result searchResponse
		if err := json.Unmarshal(body, &result); err != nil {
			return nil, fmt.Errorf("decode page %d: %w", page, err)
		}
		issues = append(issues, result.Items...)
		if len(result.Items) < 100 || len(issues) >= result.TotalCount {
			break
		}
	}
	return issues, nil
}

func (client *GitHubClient) doWithRateLimit(ctx context.Context, request *http.Request) (*http.Response, error) {
	for attempt := 0; attempt <= maxRateLimitRetries; attempt++ {
		response, err := client.HTTPClient.Do(request.Clone(ctx))
		if err != nil {
			return nil, err
		}
		if response.StatusCode != http.StatusForbidden && response.StatusCode != http.StatusTooManyRequests {
			return response, nil
		}
		if response.Header.Get("X-RateLimit-Remaining") != "0" || attempt == maxRateLimitRetries {
			return response, nil
		}

		resetAt, err := strconv.ParseInt(response.Header.Get("X-RateLimit-Reset"), 10, 64)
		if err != nil {
			return response, nil
		}
		_ = response.Body.Close()
		wait := time.Until(time.Unix(resetAt, 0)) + time.Second
		if wait <= 0 {
			continue
		}
		fmt.Printf("GitHub search rate limit reached; retrying in %s\n", wait.Round(time.Second))
		timer := time.NewTimer(wait)
		select {
		case <-ctx.Done():
			timer.Stop()
			return nil, ctx.Err()
		case <-timer.C:
		}
	}
	return nil, fmt.Errorf("GitHub request retry loop exhausted")
}

func repositoryNameFromAPIURL(value string) string {
	parsed, err := url.Parse(value)
	if err != nil {
		return ""
	}
	parts := strings.Split(strings.Trim(parsed.Path, "/"), "/")
	if len(parts) < 3 || parts[len(parts)-3] != "repos" {
		return ""
	}
	return parts[len(parts)-2] + "/" + parts[len(parts)-1]
}

func normalizeLabel(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	value = strings.NewReplacer("_", " ", "-", " ").Replace(value)
	return strings.Join(strings.Fields(value), " ")
}
