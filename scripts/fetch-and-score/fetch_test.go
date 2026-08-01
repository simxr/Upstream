package main

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestFetchCandidatesUsesAllowlistedLabelSearch(t *testing.T) {
	var server *httptest.Server
	server = httptest.NewServer(http.HandlerFunc(func(response http.ResponseWriter, request *http.Request) {
		if request.Method != http.MethodGet || request.URL.Path != "/search/issues" {
			t.Fatalf("unexpected request: %s %s", request.Method, request.URL.Path)
		}
		query := request.URL.Query().Get("q")
		if !strings.Contains(query, "repo:example/project") || !strings.Contains(query, `label:"good first issue","help wanted"`) {
			t.Fatalf("unexpected search query: %s", query)
		}
		if request.Header.Get("Authorization") != "Bearer test-token" {
			t.Fatal("missing token header")
		}
		response.Header().Set("Content-Type", "application/json")
		_, _ = response.Write([]byte(`{
          "total_count": 1,
          "items": [
            {"number":1,"title":"candidate","html_url":"https://example.test/1","repository_url":"` + server.URL + `/repos/example/project","labels":[{"name":"good-first-issue"}],"created_at":"2026-01-01T00:00:00Z","updated_at":"2026-01-02T00:00:00Z"}
          ]
        }`))
	}))
	defer server.Close()

	client := newGitHubClient(server.URL, "test-token")
	candidates, err := client.fetchCandidates(context.Background(), RepositoriesConfig{
		DiscoveryLabels: []string{"good first issue", "help wanted"},
		Repositories:    []Repository{{Repo: "example/project", Source: "manual"}},
	})
	if err != nil {
		t.Fatal(err)
	}
	if len(candidates) != 1 || candidates[0].Issue.Number != 1 {
		t.Fatalf("unexpected candidates: %#v", candidates)
	}
}

func TestRepositoryNameFromAPIURL(t *testing.T) {
	if got := repositoryNameFromAPIURL("https://api.github.com/repos/owner/project"); got != "owner/project" {
		t.Fatalf("unexpected repository name %q", got)
	}
}
