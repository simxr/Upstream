package main

import (
	"strings"
	"testing"
	"time"
)

func TestScoreCandidatesIsExplainableAndRanked(t *testing.T) {
	config := Config{
		Domains: DomainsConfig{Domains: []Domain{
			{ID: "aws-ecosystem", Label: "AWS ecosystem"},
			{ID: "observability", Label: "Observability"},
		}},
		Shapes: ShapesConfig{Shapes: []Shape{
			{ID: "bug-fix", Label: "Bug fix", LabelAliases: []string{"bug", "kind/bug"}},
			{ID: "docs", Label: "Documentation", LabelAliases: []string{"docs"}},
		}},
		Profile: Profile{
			Name:            "Tester",
			Domains:         []string{"aws-ecosystem"},
			PreferredShapes: []string{"bug-fix"},
			Skills: []Skill{
				{ID: "terraform", Label: "Terraform", Keywords: []string{"terraform"}},
			},
		},
	}
	now := time.Now()
	candidates := []Candidate{
		{
			Repository: Repository{Repo: "example/aws", Source: "manual", Domains: []string{"aws-ecosystem"}},
			Issue:      GitHubIssue{Number: 2, Title: "Terraform plan fails", Body: "reproduction", HTMLURL: "https://example.test/2", Labels: []GitHubLabel{{Name: "kind/bug"}}, UpdatedAt: now},
		},
		{
			Repository: Repository{Repo: "example/otel", Source: "manual", Domains: []string{"observability"}},
			Issue:      GitHubIssue{Number: 1, Title: "Clarify exporter", HTMLURL: "https://example.test/1", Labels: []GitHubLabel{{Name: "docs"}}, UpdatedAt: now.Add(time.Hour)},
		},
	}

	issues := scoreCandidates(candidates, config)
	if len(issues) != 2 {
		t.Fatalf("expected 2 issues, got %d", len(issues))
	}
	if issues[0].ID != "example/aws#2" {
		t.Fatalf("expected matched issue first, got %s", issues[0].ID)
	}
	if issues[0].Score != domainPoints+skillPoints+shapePoints {
		t.Fatalf("unexpected score: %d", issues[0].Score)
	}
	if !strings.Contains(issues[0].Why, "Terraform") || len(issues[0].Matches) != 3 {
		t.Fatalf("missing match audit trail: %#v", issues[0])
	}
	if issues[1].Score != 0 {
		t.Fatalf("expected unmatched issue score 0, got %d", issues[1].Score)
	}
}

func TestNormalizeLabel(t *testing.T) {
	for input, expected := range map[string]string{
		"Good-First-Issue":   "good first issue",
		" help_wanted ":      "help wanted",
		"kind/documentation": "kind/documentation",
	} {
		if actual := normalizeLabel(input); actual != expected {
			t.Errorf("normalizeLabel(%q) = %q, want %q", input, actual, expected)
		}
	}
}
