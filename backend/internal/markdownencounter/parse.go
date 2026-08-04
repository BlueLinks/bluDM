package markdownencounter

import (
	"bytes"
	"errors"
	"fmt"
	"io"
	"strings"

	"gopkg.in/yaml.v3"
)

func Parse(markdown string) ([]Block, error) {
	if len(markdown) > MaxDocumentBytes {
		return nil, fmt.Errorf("markdown exceeds the %d byte limit", MaxDocumentBytes)
	}
	lines := strings.Split(strings.ReplaceAll(markdown, "\r\n", "\n"), "\n")
	blocks := []Block{}
	for index := 0; index < len(lines); index++ {
		fence, ok := openingFence(lines[index])
		if !ok {
			continue
		}
		startLine := index + 1
		contentStart := index + 1
		index++
		for ; index < len(lines) && strings.TrimSpace(lines[index]) != fence; index++ {
		}
		if index == len(lines) {
			return nil, fmt.Errorf("line %d: bludm-encounter block is missing its closing fence", startLine)
		}
		raw := strings.Join(lines[contentStart:index], "\n")
		document, err := decodeDocument(raw)
		if err != nil {
			return nil, fmt.Errorf("line %d: %w", startLine, err)
		}
		if _, err := document.NormalizeAndValidate(); err != nil {
			return nil, fmt.Errorf("line %d: %w", startLine, err)
		}
		blocks = append(blocks, Block{Document: document, Line: startLine, Raw: raw})
		if len(blocks) > MaxEncounters {
			return nil, fmt.Errorf("markdown contains more than %d encounter blocks", MaxEncounters)
		}
	}
	if len(blocks) == 0 {
		return nil, errors.New("no fenced bludm-encounter blocks found")
	}
	return blocks, nil
}

func openingFence(line string) (string, bool) {
	trimmed := strings.TrimSpace(line)
	for _, fence := range []string{"```", "~~~"} {
		if strings.EqualFold(trimmed, fence+"bludm-encounter") {
			return fence, true
		}
	}
	return "", false
}

func decodeDocument(raw string) (Document, error) {
	var document Document
	decoder := yaml.NewDecoder(bytes.NewBufferString(raw))
	decoder.KnownFields(true)
	if err := decoder.Decode(&document); err != nil {
		return Document{}, fmt.Errorf("invalid encounter YAML: %w", err)
	}
	var trailing any
	if err := decoder.Decode(&trailing); err != io.EOF {
		if err == nil {
			return Document{}, errors.New("encounter block must contain one YAML document")
		}
		return Document{}, fmt.Errorf("invalid trailing YAML: %w", err)
	}
	return document, nil
}
