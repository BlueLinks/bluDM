package markdownworld

import (
	"bytes"
	"errors"
	"fmt"
	"io"
	"strings"

	"gopkg.in/yaml.v3"
)

func Parse(markdown string) (Blocks, error) {
	if len(markdown) > MaxDocumentBytes {
		return Blocks{}, fmt.Errorf("markdown exceeds the %d byte limit", MaxDocumentBytes)
	}
	lines := strings.Split(strings.ReplaceAll(markdown, "\r\n", "\n"), "\n")
	blocks := Blocks{NPCs: []NPCBlock{}, Dungeons: []DungeonBlock{}}
	total := 0
	for index := 0; index < len(lines); index++ {
		fence, kind, ok := openingFence(lines[index])
		if !ok {
			continue
		}
		startLine := index + 1
		contentStart := index + 1
		index++
		for ; index < len(lines) && strings.TrimSpace(lines[index]) != fence; index++ {
		}
		if index == len(lines) {
			return Blocks{}, fmt.Errorf("line %d: %s block is missing its closing fence", startLine, kind)
		}
		raw := strings.Join(lines[contentStart:index], "\n")
		switch kind {
		case "bludm-npc":
			var document NPCDocument
			if err := decodeKnownYAML(raw, &document, "NPC"); err != nil {
				return Blocks{}, fmt.Errorf("line %d: %w", startLine, err)
			}
			if err := document.NormalizeAndValidate(); err != nil {
				return Blocks{}, fmt.Errorf("line %d: %w", startLine, err)
			}
			blocks.NPCs = append(blocks.NPCs, NPCBlock{Document: document, Line: startLine, Raw: raw})
		case "bludm-dungeon":
			var document DungeonDocument
			if err := decodeKnownYAML(raw, &document, "dungeon"); err != nil {
				return Blocks{}, fmt.Errorf("line %d: %w", startLine, err)
			}
			if err := document.NormalizeAndValidate(); err != nil {
				return Blocks{}, fmt.Errorf("line %d: %w", startLine, err)
			}
			blocks.Dungeons = append(blocks.Dungeons, DungeonBlock{Document: document, Line: startLine, Raw: raw})
		}
		total++
		if total > MaxBlocks {
			return Blocks{}, fmt.Errorf("markdown contains more than %d NPC or dungeon blocks", MaxBlocks)
		}
	}
	if total == 0 {
		return Blocks{}, errors.New("no fenced bludm-npc or bludm-dungeon blocks found")
	}
	return blocks, nil
}

func openingFence(line string) (string, string, bool) {
	trimmed := strings.TrimSpace(line)
	for _, fence := range []string{"```", "~~~"} {
		for _, kind := range []string{"bludm-npc", "bludm-dungeon"} {
			if strings.EqualFold(trimmed, fence+kind) {
				return fence, kind, true
			}
		}
	}
	return "", "", false
}

func decodeKnownYAML(raw string, target any, label string) error {
	decoder := yaml.NewDecoder(bytes.NewBufferString(raw))
	decoder.KnownFields(true)
	if err := decoder.Decode(target); err != nil {
		return fmt.Errorf("invalid %s YAML: %w", label, err)
	}
	var trailing any
	if err := decoder.Decode(&trailing); err != io.EOF {
		if err == nil {
			return fmt.Errorf("%s block must contain one YAML document", label)
		}
		return fmt.Errorf("invalid trailing YAML: %w", err)
	}
	return nil
}
