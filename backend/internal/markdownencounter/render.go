package markdownencounter

import (
	"fmt"
	"strings"

	"gopkg.in/yaml.v3"
)

func Render(document Document) (string, error) {
	if _, err := document.NormalizeAndValidate(); err != nil {
		return "", err
	}
	data, err := yaml.Marshal(document)
	if err != nil {
		return "", fmt.Errorf("marshal encounter YAML: %w", err)
	}
	return "```bludm-encounter\n" + strings.TrimSpace(string(data)) + "\n```\n", nil
}
