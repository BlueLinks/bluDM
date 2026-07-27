package markdownworld

import "testing"

func TestParseNPCAndGeneratedDungeonBlocks(t *testing.T) {
	markdown := `# The Sunken Keep

Ordinary prose remains in Obsidian.

` + "```bludm-npc" + `
version: 1
id: keeper-voss
name: Keeper Voss
armor_class: 13
hit_points: 22
disposition: neutral
location: The Sunken Keep
stat_block:
  abilityScores:
    charisma: 16
` + "```" + `

` + "```bludm-dungeon" + `
version: 1
id: sunken-keep
name: The Sunken Keep
map:
  generator:
    type: classic
    seed: keep-seed
    width: 30
    height: 24
    room_count: 6
    create_rooms: true
` + "```"

	blocks, err := Parse(markdown)
	if err != nil {
		t.Fatal(err)
	}
	if len(blocks.NPCs) != 1 || len(blocks.Dungeons) != 1 {
		t.Fatalf("unexpected parsed blocks: %+v", blocks)
	}
	if blocks.NPCs[0].Document.Name != "Keeper Voss" {
		t.Fatalf("unexpected NPC: %+v", blocks.NPCs[0])
	}
	settings := blocks.Dungeons[0].Document.Map.Generator.Settings()
	if settings.Seed != "keep-seed" || settings.RoomCount != 6 || !settings.CreateRooms {
		t.Fatalf("unexpected generator settings: %+v", settings)
	}
}

func TestParseRejectsUnknownFields(t *testing.T) {
	_, err := Parse("```bludm-npc\nversion: 1\nid: voss\nname: Voss\narmor_class: 12\nhit_points: 10\nmystery: true\n```\n")
	if err == nil {
		t.Fatal("expected unknown fields to be rejected")
	}
}
