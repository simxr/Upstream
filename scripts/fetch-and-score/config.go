package main

import (
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"

	"gopkg.in/yaml.v3"
)

var profileSlugPattern = regexp.MustCompile(`^[a-z0-9]+(?:-[a-z0-9]+)*$`)
var githubUsernamePattern = regexp.MustCompile(`^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$`)

func loadConfig(dir string) (Config, error) {
	var config Config

	files := []struct {
		name string
		out  any
	}{
		{"domains.yaml", &config.Domains},
		{"shapes.yaml", &config.Shapes},
		{"repos.yaml", &config.Repositories},
		{"profile.yaml", &config.Profile},
	}

	for _, file := range files {
		path := filepath.Join(dir, file.name)
		contents, err := os.ReadFile(path)
		if err != nil {
			return Config{}, fmt.Errorf("read %s: %w", path, err)
		}
		if err := yaml.Unmarshal(contents, file.out); err != nil {
			return Config{}, fmt.Errorf("parse %s: %w", path, err)
		}
	}

	if err := validateConfig(config); err != nil {
		return Config{}, err
	}
	return config, nil
}

func validateConfig(config Config) error {
	if strings.TrimSpace(config.Profile.Name) == "" {
		return fmt.Errorf("config/profile.yaml: name is required")
	}
	if !profileSlugPattern.MatchString(config.Profile.Slug) {
		return fmt.Errorf("config/profile.yaml: slug must be lowercase, URL-safe, and hyphen-separated")
	}
	if !githubUsernamePattern.MatchString(config.Profile.GitHubUsername) {
		return fmt.Errorf("config/profile.yaml: github_username is invalid")
	}
	if len(config.Repositories.Repositories) == 0 {
		return fmt.Errorf("config/repos.yaml: at least one repository is required")
	}
	if len(config.Repositories.DiscoveryLabels) == 0 {
		return fmt.Errorf("config/repos.yaml: at least one discovery label is required")
	}

	domains := make(map[string]bool, len(config.Domains.Domains))
	for _, domain := range config.Domains.Domains {
		if domain.ID == "" || domains[domain.ID] {
			return fmt.Errorf("config/domains.yaml: domain IDs must be non-empty and unique: %q", domain.ID)
		}
		domains[domain.ID] = true
	}

	shapes := make(map[string]bool, len(config.Shapes.Shapes))
	for _, shape := range config.Shapes.Shapes {
		if shape.ID == "" || shapes[shape.ID] {
			return fmt.Errorf("config/shapes.yaml: shape IDs must be non-empty and unique: %q", shape.ID)
		}
		shapes[shape.ID] = true
	}

	for _, domain := range config.Profile.Domains {
		if !domains[domain] {
			return fmt.Errorf("config/profile.yaml: unknown domain %q", domain)
		}
	}
	for _, shape := range config.Profile.PreferredShapes {
		if !shapes[shape] {
			return fmt.Errorf("config/profile.yaml: unknown preferred shape %q", shape)
		}
	}

	repositories := map[string]bool{}
	for _, repository := range config.Repositories.Repositories {
		parts := strings.Split(repository.Repo, "/")
		if len(parts) != 2 || parts[0] == "" || parts[1] == "" {
			return fmt.Errorf("config/repos.yaml: repository must use owner/name format: %q", repository.Repo)
		}
		if repositories[strings.ToLower(repository.Repo)] {
			return fmt.Errorf("config/repos.yaml: duplicate repository %q", repository.Repo)
		}
		repositories[strings.ToLower(repository.Repo)] = true
		for _, domain := range repository.Domains {
			if !domains[domain] {
				return fmt.Errorf("config/repos.yaml: repository %s has unknown domain %q", repository.Repo, domain)
			}
		}
	}

	skills := map[string]bool{}
	for _, skill := range config.Profile.Skills {
		if skill.ID == "" || skills[skill.ID] {
			return fmt.Errorf("config/profile.yaml: skill IDs must be non-empty and unique: %q", skill.ID)
		}
		if len(skill.Keywords) == 0 {
			return fmt.Errorf("config/profile.yaml: skill %q needs at least one keyword", skill.ID)
		}
		skills[skill.ID] = true
	}

	return nil
}
