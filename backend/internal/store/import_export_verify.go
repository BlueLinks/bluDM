package store

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"strings"
)

func VerifyArchive(manifest PortableManifest, assets map[string][]byte) ArchiveVerification {
	graph := BuildDependencyGraph(manifest)
	verification := ArchiveVerification{
		ArchiveValid:         true,
		ManifestValid:        true,
		GraphValid:           true,
		InternalRecordsValid: true,
		LogicalFilesValid:    true,
		AssetsVerified:       true,
		DependenciesComplete: true,
		StandardReferencesOK: true,
		Messages:             []string{},
	}
	if err := ValidatePortableManifest(manifest); err != nil {
		verification.ArchiveValid = false
		verification.ManifestValid = false
		verification.Messages = append(verification.Messages, err.Error())
		if strings.Contains(err.Error(), "version") {
			verification.UnsupportedFuture = true
		}
	}
	if err := validateUniqueManifestIDs(manifest); err != nil {
		verification.DuplicateEntities = true
		verification.Messages = append(verification.Messages, err.Error())
	}
	nodeIDs := map[string]struct{}{}
	for _, node := range graph.Nodes {
		if _, ok := nodeIDs[node.ID]; ok {
			verification.GraphValid = false
			verification.Messages = append(verification.Messages, fmt.Sprintf("duplicate graph node %s", node.ID))
		}
		nodeIDs[node.ID] = struct{}{}
	}
	for _, edge := range graph.Edges {
		if _, ok := nodeIDs[edge.From]; !ok {
			verification.GraphValid = false
			verification.Messages = append(verification.Messages, fmt.Sprintf("graph edge references missing source %s", edge.From))
		}
		if _, ok := nodeIDs[edge.To]; !ok {
			verification.GraphValid = false
			verification.Messages = append(verification.Messages, fmt.Sprintf("graph edge references missing target %s", edge.To))
		}
	}
	verification.OrphanedGraphNodes = graph.Audit.OrphanedNodes
	verification.MissingRequired = graph.Audit.MissingRequired
	verification.UnexpectedCycles = graph.Audit.UnexpectedCycles
	if graph.Audit.MissingRequired > 0 || len(graph.Audit.Errors) > 0 {
		verification.DependenciesComplete = false
		verification.GraphValid = false
		verification.Messages = append(verification.Messages, graph.Audit.Errors...)
	}
	if graph.Audit.OrphanedNodes > 0 || graph.Audit.UnexpectedCycles > 0 {
		verification.Messages = append(verification.Messages, graph.Audit.Warnings...)
	}
	if err := verifyManifestAssets(manifest, assets); err != nil {
		verification.AssetsVerified = false
		verification.Messages = append(verification.Messages, err.Error())
	}
	return verification
}

func verifyManifestAssets(manifest PortableManifest, assets map[string][]byte) error {
	paths := map[string]struct{}{}
	for _, asset := range manifest.Assets {
		if strings.TrimSpace(asset.Path) == "" {
			return fmt.Errorf("manifest contains an asset without a path")
		}
		paths[asset.Path] = struct{}{}
		data, ok := assets[asset.Path]
		if !ok {
			return fmt.Errorf("manifest references missing asset %s", asset.Path)
		}
		if asset.ByteSize > 0 && int64(len(data)) != asset.ByteSize {
			return fmt.Errorf("asset %s byte size does not match manifest", asset.Path)
		}
		if strings.TrimSpace(asset.SHA256) != "" {
			sum := sha256.Sum256(data)
			if hex.EncodeToString(sum[:]) != strings.TrimSpace(asset.SHA256) {
				return fmt.Errorf("asset %s hash does not match manifest", asset.Path)
			}
		}
	}
	for path := range assets {
		if _, ok := paths[path]; !ok {
			return fmt.Errorf("archive contains orphaned asset %s", path)
		}
	}
	return nil
}
