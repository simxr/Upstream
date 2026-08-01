package main

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestBuildJourneyProducesVerifiableMergedEvidence(t *testing.T) {
	mergedAt := "2026-07-30T12:34:56Z"
	server := httptest.NewServer(http.HandlerFunc(func(response http.ResponseWriter, request *http.Request) {
		if request.URL.Path != "/search/issues" {
			t.Fatalf("unexpected request path %s", request.URL.Path)
		}
		query := request.URL.Query().Get("q")
		if !strings.Contains(query, "repo:example/platform") || !strings.Contains(query, "is:pr is:merged author:test-user") {
			t.Fatalf("unexpected journey query %q", query)
		}
		response.Header().Set("Content-Type", "application/json")
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
	if journey.Slug != "test-user" || journey.GitHubUsername != "test-user" || len(journey.Entries) != 1 {
		t.Fatalf("unexpected journey: %#v", journey)
	}
	entry := journey.Entries[0]
	if entry.PRNumber != 42 || entry.LinkedIssue != "example/platform#17" {
		t.Fatalf("unexpected contribution evidence: %#v", entry)
	}
	if entry.MergedAt.Format(time.RFC3339) != mergedAt {
		t.Fatalf("expected merged timestamp %s, got %s", mergedAt, entry.MergedAt.Format(time.RFC3339))
	}
	if len(entry.DomainTags) != 1 || entry.DomainTags[0] != "kubernetes-controllers" || len(entry.ShapeTags) != 1 || entry.ShapeTags[0] != "bug-fix" {
		t.Fatalf("expected configured classifications, got %#v", entry)
	}
}

func TestLinkedIssueFromBodySupportsFullURLs(t *testing.T) {
	got := linkedIssueFromBody("example/current", "Resolves https://github.com/example/other/issues/99")
	if got != "example/other#99" {
		t.Fatalf("unexpected linked issue %q", got)
	}
}
