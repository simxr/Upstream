package main

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestBuildJourneyProducesVerifiableContributionEvidence(t *testing.T) {
	mergedAt := "2026-07-30T12:34:56Z"
	issueCreatedAt := "2026-07-01T09:30:18Z"
	server := httptest.NewServer(http.HandlerFunc(func(response http.ResponseWriter, request *http.Request) {
		if request.URL.Path != "/search/issues" {
			t.Fatalf("unexpected request path %s", request.URL.Path)
		}
		query := request.URL.Query().Get("q")
		if !strings.Contains(query, "repo:example/platform") || !strings.Contains(query, "author:test-user") {
			t.Fatalf("unexpected journey query %q", query)
		}
		response.Header().Set("Content-Type", "application/json")
		if strings.Contains(query, "is:pr is:merged") {
			_, _ = response.Write([]byte(`{
          "total_count": 1,
          "items": [{
            "number": 42,
            "title": "Repair the controller reconciliation path",
            "body": "Fixes #17",
            "html_url": "https://github.com/example/platform/pull/42",
            "repository_url": "https://api.github.com/repos/example/platform",
            "labels": [{"name":"kind/bug"}],
            "updated_at": "2026-07-30T12:35:00Z",
            "pull_request": {"merged_at":"` + mergedAt + `"}
          }]
        }`))
			return
		}
		if strings.Contains(query, "is:issue") {
			_, _ = response.Write([]byte(`{
          "total_count": 1,
          "items": [{
            "number": 55,
            "title": "Document a missing webhook annotation",
            "body": "",
            "html_url": "https://github.com/example/platform/issues/55",
            "repository_url": "https://api.github.com/repos/example/platform",
            "state": "open",
            "labels": [{"name":"kind/bug"}],
            "created_at": "` + issueCreatedAt + `",
            "updated_at": "2026-07-01T09:30:18Z"
          }]
        }`))
			return
		}
		t.Fatalf("unexpected journey query %q", query)
	}))
	defer server.Close()

	generatedAt := time.Date(2026, time.August, 2, 0, 0, 0, 0, time.UTC)
	config := Config{
		Shapes: ShapesConfig{Shapes: []Shape{{ID: "bug-fix", LabelAliases: []string{"kind/bug"}}}},
		Repositories: RepositoriesConfig{Repositories: []Repository{{
			Repo: "example/platform", Domains: []string{"kubernetes-controllers"},
		}}},
		Profile: Profile{Name: "Test User", Slug: "test-user", GitHubUsername: "test-user"},
	}

	journey, err := buildJourney(context.Background(), newGitHubClient(server.URL, "test-token"), config, generatedAt)
	if err != nil {
		t.Fatal(err)
	}
	if journey.Slug != "test-user" || journey.GitHubUsername != "test-user" || len(journey.Entries) != 2 {
		t.Fatalf("unexpected journey: %#v", journey)
	}
	mergedEntry := journey.Entries[0]
	if mergedEntry.Kind != "merged_pr" || mergedEntry.Number != 42 || mergedEntry.LinkedIssue != "example/platform#17" {
		t.Fatalf("unexpected merged contribution evidence: %#v", mergedEntry)
	}
	if mergedEntry.OccurredAt.Format(time.RFC3339) != mergedAt {
		t.Fatalf("expected merged timestamp %s, got %s", mergedAt, mergedEntry.OccurredAt.Format(time.RFC3339))
	}
	if len(mergedEntry.DomainTags) != 1 || mergedEntry.DomainTags[0] != "kubernetes-controllers" || len(mergedEntry.ShapeTags) != 1 || mergedEntry.ShapeTags[0] != "bug-fix" {
		t.Fatalf("expected configured classifications, got %#v", mergedEntry)
	}
	issueEntry := journey.Entries[1]
	if issueEntry.Kind != "opened_issue" || issueEntry.Number != 55 || issueEntry.State != "open" {
		t.Fatalf("unexpected issue contribution evidence: %#v", issueEntry)
	}
	if issueEntry.OccurredAt.Format(time.RFC3339) != issueCreatedAt {
		t.Fatalf("expected issue timestamp %s, got %s", issueCreatedAt, issueEntry.OccurredAt.Format(time.RFC3339))
	}
}

func TestLinkedIssueFromBodySupportsFullURLs(t *testing.T) {
	got := linkedIssueFromBody("example/current", "Resolves https://github.com/example/other/issues/99")
	if got != "example/other#99" {
		t.Fatalf("unexpected linked issue %q", got)
	}
}
