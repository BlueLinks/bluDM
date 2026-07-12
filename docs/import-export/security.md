# Import / Export Security

The import surface treats bundles as untrusted input.

Current safeguards:

- authenticated endpoints only
- same-origin CSRF protection through the existing API middleware
- maximum upload size of 50 MB
- maximum ZIP entry count
- duplicate ZIP entry rejection
- unsupported ZIP compression method rejection
- ZIP path traversal rejection
- malformed ZIP rejection
- malformed manifest rejection
- missing or unindexed v2 logical JSON file rejection
- malformed v2 graph and internal record rejection
- unsupported format and version rejection
- duplicate manifest ID rejection
- missing, unlisted, oversized, or unsupported-MIME asset rejection
- SHA-256 asset hash verification
- per-asset extraction limit
- clone import ignores source owner IDs
- clone import does not preserve original UUID references for supported owned data
- clone import runs in a database transaction
- restore import requires explicit confirmation
- restore import rejects non-empty current-user targets
- restore import runs in a database transaction and preserves IDs only after archive verification
- merge import requires explicit confirmation
- merge import re-plans inside the write transaction
- merge import blocks destructive replacement and child collection merge into existing roots
- merge provenance is ignored by content fingerprints so audit metadata does not force duplicate
  imports
- safe user-facing error messages

Known follow-up hardening:

- per-bundle asset count and total extracted-byte limits
- content sniffing for asset files in addition to manifest MIME validation
- structured audit logging for preview and execution
- manifest migration tests for future versions
