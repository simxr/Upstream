package main

import "time"

type Domain struct {
	ID          string `yaml:"id"`
	Label       string `yaml:"label"`
	Description string `yaml:"description"`
}

type DomainsConfig struct {
	Domains []Domain `yaml:"domains"`
}

type Shape struct {
	ID           string   `yaml:"id"`
	Label        string   `yaml:"label"`
	Description  string   `yaml:"description"`
	LabelAliases []string `yaml:"label_aliases"`
}

type ShapesConfig struct {
	Shapes []Shape `yaml:"shapes"`
}

type Repository struct {
	Repo    string   `yaml:"repo"`
	Source  string   `yaml:"source"`
	Domains []string `yaml:"domains"`
}

type RepositoriesConfig struct {
	DiscoveryLabels []string     `yaml:"discovery_labels"`
	Repositories    []Repository `yaml:"repositories"`
}

type Skill struct {
	ID       string   `yaml:"id"`
	Label    string   `yaml:"label"`
	Keywords []string `yaml:"keywords"`
}

type Profile struct {
	Name            string   `yaml:"name"`
	Domains         []string `yaml:"domains"`
	PreferredShapes []string `yaml:"preferred_shapes"`
	Skills          []Skill  `yaml:"skills"`
}

type Config struct {
	Domains      DomainsConfig
	Shapes       ShapesConfig
	Repositories RepositoriesConfig
	Profile      Profile
}

type GitHubLabel struct {
	Name string `json:"name"`
}

type GitHubIssue struct {
	Number        int           `json:"number"`
	Title         string        `json:"title"`
	Body          string        `json:"body"`
	HTMLURL       string        `json:"html_url"`
	RepositoryURL string        `json:"repository_url"`
	State         string        `json:"state"`
	Labels        []GitHubLabel `json:"labels"`
	Assignees     []struct{}    `json:"assignees"`
	PullRequest   *struct{}     `json:"pull_request,omitempty"`
	CreatedAt     time.Time     `json:"created_at"`
	UpdatedAt     time.Time     `json:"updated_at"`
}

type Candidate struct {
	Issue      GitHubIssue
	Repository Repository
}

type Match struct {
	Kind   string `json:"kind"`
	Tag    string `json:"tag"`
	Label  string `json:"label"`
	Points int    `json:"points"`
}

type FeedIssue struct {
	ID            string    `json:"id"`
	Repository    string    `json:"repository"`
	Source        string    `json:"source"`
	Number        int       `json:"number"`
	Title         string    `json:"title"`
	URL           string    `json:"url"`
	Labels        []string  `json:"labels"`
	DomainTags    []string  `json:"domain_tags"`
	ShapeTags     []string  `json:"shape_tags"`
	TechnicalTags []string  `json:"technical_tags"`
	Score         int       `json:"score"`
	Why           string    `json:"why"`
	Matches       []Match   `json:"matches"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

type Feed struct {
	GeneratedAt time.Time   `json:"generated_at"`
	Profile     string      `json:"profile"`
	Total       int         `json:"total"`
	Issues      []FeedIssue `json:"issues"`
}
