package store

import (
	"errors"

	"gorm.io/gorm"
)

var ErrNotFound = errors.New("not found")

type Stores struct {
	db           *gorm.DB
	Auth         AuthStore
	Assets       AssetStore
	Campaigns    CampaignStore
	Creatures    CreatureStore
	Players      PlayerStore
	Items        ItemStore
	Library      LibraryStore
	RollTables   RollTableStore
	Travel       TravelStore
	Spells       SpellStore
	Actions      ActionStore
	Spellcasts   SpellcastingStore
	Encounters   EncounterStore
	Runs         RunStore
	Demo         DemoStore
	ImportExport ImportExportStore
}

func New(db *gorm.DB) *Stores {
	stores := &Stores{db: db}
	stores.Auth = AuthStore{db: db}
	stores.Assets = AssetStore{db: db}
	stores.Campaigns = CampaignStore{db: db}
	stores.Creatures = CreatureStore{db: db}
	stores.Players = PlayerStore{db: db}
	stores.Items = ItemStore{db: db}
	stores.Library = LibraryStore{db: db}
	stores.RollTables = RollTableStore{db: db}
	stores.Travel = TravelStore{db: db}
	stores.Spells = SpellStore{db: db}
	stores.Actions = ActionStore{db: db}
	stores.Spellcasts = SpellcastingStore{db: db}
	stores.Encounters = EncounterStore{db: db}
	stores.Runs = RunStore{db: db}
	stores.Demo = DemoStore{db: db}
	stores.ImportExport = ImportExportStore{db: db}
	return stores
}

func IsNotFound(err error) bool {
	return errors.Is(err, ErrNotFound) || errors.Is(err, gorm.ErrRecordNotFound)
}

func stringFromPointer(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}

func stringPointer(value string) *string {
	if value == "" {
		return nil
	}
	return &value
}
