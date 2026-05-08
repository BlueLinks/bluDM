package db

import (
	_ "embed"
	"encoding/json"
	"fmt"
)

//go:embed standard_entries.json
var standardEntriesJSON []byte

type standardSourceSeed struct {
	Key         string
	Label       string
	Ruleset     string
	LicenseName string
	SourceURL   string
	Attribution string
}

type standardLibraryEntrySeed struct {
	SourceKey   string          `json:"sourceKey"`
	Category    string          `json:"category"`
	Slug        string          `json:"slug"`
	Name        string          `json:"name"`
	Summary     string          `json:"summary"`
	Description string          `json:"description"`
	Data        json.RawMessage `json:"data"`
}

var standardSources = []standardSourceSeed{
	{
		Key:         "srd-2014",
		Label:       "SRD 2014",
		Ruleset:     "D&D 5e 2014",
		LicenseName: "OGL 1.0a / 5e SRD API data",
		SourceURL:   "https://www.dnd5eapi.co/",
		Attribution: "Structured SRD 2014 content from the 5e-bits D&D 5e SRD API.",
	},
	{
		Key:         "srd-5-2-1",
		Label:       "SRD 5.2.1",
		Ruleset:     "D&D 2024",
		LicenseName: "Creative Commons Attribution 4.0 International",
		SourceURL:   "https://www.dndbeyond.com/srd",
		Attribution: "System Reference Document 5.2.1 by Wizards of the Coast LLC.",
	},
}

func parseStandardLibraryEntries() ([]standardLibraryEntrySeed, error) {
	var entries []standardLibraryEntrySeed
	if err := json.Unmarshal(standardEntriesJSON, &entries); err != nil {
		return nil, fmt.Errorf("parse standard library entries: %w", err)
	}
	for index, entry := range entries {
		if entry.SourceKey == "" || entry.Category == "" || entry.Slug == "" || entry.Name == "" {
			return nil, fmt.Errorf("standard library entry at index %d is missing required fields", index)
		}
		if len(entry.Data) == 0 {
			entries[index].Data = json.RawMessage(`{}`)
		}
	}
	return entries, nil
}

const standardLibrarySchemaSQL = `
create table if not exists standard_sources (
    source_key text primary key,
    label text not null,
    ruleset text not null default '',
    license_name text not null default '',
    source_url text not null default '',
    attribution text not null default '',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists standard_library_entries (
    id uuid primary key default gen_random_uuid(),
    source_key text not null references standard_sources(source_key) on delete restrict,
    category text not null,
    slug text not null,
    name text not null,
    summary text not null default '',
    description text not null default '',
    data jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique(source_key, category, slug)
);

create index if not exists standard_library_entries_category_idx on standard_library_entries(category, name);
create index if not exists standard_library_entries_source_idx on standard_library_entries(source_key, category, name);
`

const upsertStandardSourceSQL = `
insert into standard_sources (source_key, label, ruleset, license_name, source_url, attribution)
values ($1, $2, $3, $4, $5, $6)
on conflict (source_key) do update set
    label = excluded.label,
    ruleset = excluded.ruleset,
    license_name = excluded.license_name,
    source_url = excluded.source_url,
    attribution = excluded.attribution,
    updated_at = now();
`

const upsertStandardLibraryEntrySQL = `
insert into standard_library_entries (source_key, category, slug, name, summary, description, data)
values ($1, $2, $3, $4, $5, $6, $7)
on conflict (source_key, category, slug) do update set
    name = excluded.name,
    summary = excluded.summary,
    description = excluded.description,
    data = excluded.data,
    updated_at = now();
`
