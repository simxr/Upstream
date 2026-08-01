package main

import (
	"fmt"
	"sort"
	"strings"
)

const (
	domainPoints = 2
	skillPoints  = 1
	shapePoints  = 1
)

func scoreCandidates(candidates []Candidate, config Config) []FeedIssue {
	domainLabels := make(map[string]string, len(config.Domains.Domains))
	for _, domain := range config.Domains.Domains {
		domainLabels[domain.ID] = domain.Label
	}
	profileDomains := toSet(config.Profile.Domains)
	preferredShapes := toSet(config.Profile.PreferredShapes)

	shapeByAlias := map[string]Shape{}
	for _, shape := range config.Shapes.Shapes {
		for _, alias := range shape.LabelAliases {
			shapeByAlias[normalizeLabel(alias)] = shape
		}
	}

	feedIssues := make([]FeedIssue, 0, len(candidates))
	for _, candidate := range candidates {
		shapeTags := inferShapes(candidate.Issue.Labels, shapeByAlias)
		technicalTags := inferSkills(candidate.Issue, config.Profile.Skills)
		matches := make([]Match, 0)

		for _, domain := range candidate.Repository.Domains {
			if profileDomains[domain] {
				matches = append(matches, Match{Kind: "domain", Tag: domain, Label: domainLabels[domain], Points: domainPoints})
			}
		}
		for _, skillID := range technicalTags {
			for _, skill := range config.Profile.Skills {
				if skill.ID == skillID {
					matches = append(matches, Match{Kind: "skill", Tag: skill.ID, Label: skill.Label, Points: skillPoints})
					break
				}
			}
		}
		for _, shape := range shapeTags {
			if preferredShapes[shape] {
				label := shape
				for _, configuredShape := range config.Shapes.Shapes {
					if configuredShape.ID == shape {
						label = configuredShape.Label
						break
					}
				}
				matches = append(matches, Match{Kind: "shape", Tag: shape, Label: label, Points: shapePoints})
			}
		}

		score := 0
		for _, match := range matches {
			score += match.Points
		}
		labels := make([]string, 0, len(candidate.Issue.Labels))
		for _, label := range candidate.Issue.Labels {
			labels = append(labels, label.Name)
		}
		sort.Strings(labels)

		feedIssues = append(feedIssues, FeedIssue{
			ID:            fmt.Sprintf("%s#%d", candidate.Repository.Repo, candidate.Issue.Number),
			Repository:    candidate.Repository.Repo,
			Source:        candidate.Repository.Source,
			Number:        candidate.Issue.Number,
			Title:         candidate.Issue.Title,
			URL:           candidate.Issue.HTMLURL,
			Labels:        labels,
			DomainTags:    sortedCopy(candidate.Repository.Domains),
			ShapeTags:     shapeTags,
			TechnicalTags: technicalTags,
			Stars:         candidate.Stars,
			Score:         score,
			Why:           explainMatches(matches),
			Matches:       matches,
			CreatedAt:     candidate.Issue.CreatedAt,
			UpdatedAt:     candidate.Issue.UpdatedAt,
		})
	}

	sort.SliceStable(feedIssues, func(left, right int) bool {
		if feedIssues[left].Score != feedIssues[right].Score {
			return feedIssues[left].Score > feedIssues[right].Score
		}
		return feedIssues[left].UpdatedAt.After(feedIssues[right].UpdatedAt)
	})
	return feedIssues
}

func inferShapes(labels []GitHubLabel, shapeByAlias map[string]Shape) []string {
	found := map[string]bool{}
	for _, label := range labels {
		if shape, ok := shapeByAlias[normalizeLabel(label.Name)]; ok {
			found[shape.ID] = true
		}
	}
	return sortedSet(found)
}

func inferSkills(issue GitHubIssue, skills []Skill) []string {
	labelNames := make([]string, 0, len(issue.Labels))
	for _, label := range issue.Labels {
		labelNames = append(labelNames, label.Name)
	}
	haystack := strings.ToLower(issue.Title + "\n" + issue.Body + "\n" + strings.Join(labelNames, "\n"))
	found := map[string]bool{}
	for _, skill := range skills {
		for _, keyword := range skill.Keywords {
			if strings.Contains(haystack, strings.ToLower(keyword)) {
				found[skill.ID] = true
				break
			}
		}
	}
	return sortedSet(found)
}

func explainMatches(matches []Match) string {
	if len(matches) == 0 {
		return "Surfaced from a curated project because maintainers marked it as approachable; no direct profile match was detected."
	}

	byKind := map[string][]string{}
	for _, match := range matches {
		byKind[match.Kind] = append(byKind[match.Kind], match.Label)
	}
	parts := make([]string, 0, 3)
	if values := uniqueSorted(byKind["domain"]); len(values) > 0 {
		parts = append(parts, "domain: "+humanJoin(values))
	}
	if values := uniqueSorted(byKind["skill"]); len(values) > 0 {
		parts = append(parts, "skills: "+humanJoin(values))
	}
	if values := uniqueSorted(byKind["shape"]); len(values) > 0 {
		parts = append(parts, "preferred work: "+humanJoin(values))
	}
	return "Matches your " + strings.Join(parts, "; ") + "."
}

func humanJoin(values []string) string {
	if len(values) == 1 {
		return values[0]
	}
	return strings.Join(values[:len(values)-1], ", ") + " and " + values[len(values)-1]
}

func toSet(values []string) map[string]bool {
	set := make(map[string]bool, len(values))
	for _, value := range values {
		set[value] = true
	}
	return set
}

func sortedSet(values map[string]bool) []string {
	result := make([]string, 0, len(values))
	for value := range values {
		result = append(result, value)
	}
	sort.Strings(result)
	return result
}

func sortedCopy(values []string) []string {
	result := append([]string(nil), values...)
	sort.Strings(result)
	return result
}

func uniqueSorted(values []string) []string {
	set := toSet(values)
	return sortedSet(set)
}
