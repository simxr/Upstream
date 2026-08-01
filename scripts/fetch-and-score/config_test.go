package main

import (
	"strings"
	"testing"
)

func TestValidateConfigRequiresPublicProfileIdentity(t *testing.T) {
	config := validTestConfig()
	config.Profile.Slug = "Not URL Safe"
	if err := validateConfig(config); err == nil || !strings.Contains(err.Error(), "slug") {
		t.Fatalf("expected slug validation error, got %v", err)
	}

	config = validTestConfig()
	config.Profile.GitHubUsername = "bad handle"
	if err := validateConfig(config); err == nil || !strings.Contains(err.Error(), "github_username") {
		t.Fatalf("expected GitHub username validation error, got %v", err)
	}
}

func validTestConfig() Config {
	return Config{
		Domains: DomainsConfig{Domains: []Domain{{ID: "platform"}}},
		Shapes:  ShapesConfig{Shapes: []Shape{{ID: "docs"}}},
		Repositories: RepositoriesConfig{
			DiscoveryLabels: []string{"help wanted"},
			Repositories:    []Repository{{Repo: "example/platform", Domains: []string{"platform"}}},
		},
		Profile: Profile{
			Name:            "Test User",
			Slug:            "test-user",
			GitHubUsername:  "test-user",
			Domains:         []string{"platform"},
			PreferredShapes: []string{"docs"},
			Skills:          []Skill{{ID: "docs", Keywords: []string{"documentation"}}},
		},
	}
}
