# Test Assets — Phase 1

## Mock Mode

Mock mode (`NEXT_PUBLIC_MOCK_MODE=true`) returns hardcoded fixtures from `src/lib/mocks.ts`.
Any image file can be uploaded — the content is ignored.

### Expected Mock Values

| Step | Question | Mock L/W/D |
|------|----------|------------|
| 1 | "Are these the bounding boxes for the views, and is the highlighted one the primary view?" | 2 views detected (Primary + Side) |
| 2 | "Does this box accurately capture the overall part envelope in the primary view?" | Single envelope box |
| 3 | "Are the Length and Width axes and values correct for this primary view?" | L: 120mm, W: 80mm |
| 4 | "Is this the correct depth (thickness) dimension?" | D: 35mm |
| 5 | "Lock final orientation?" | Datum: top face, X→L, Y→W, Z→D |

## Live Mode Test Drawings

For live-mode testing (`NEXT_PUBLIC_MOCK_MODE=false`), use real machinist prints.
Place test drawings in `docs/test-prints/` (gitignored for IP protection).

### Recommended Test Cases

| # | Drawing Type | Expected Views | Expected L/W/D | Notes |
|---|-------------|----------------|-----------------|-------|
| 1 | Simple bracket (2-view) | Front + Right | ~100–200mm range | Good for basic detection |
| 2 | Plate with holes (3-view) | Front + Top + Right | Larger dims, multiple features | Tests view classification |
| 3 | Complex machined part | 3+ views + section | Variable | Tests depth from alternate view |

### How to Add Test Prints

1. Place PNG/JPG/PDF files in `docs/test-prints/`
2. Ensure `.gitignore` excludes `docs/test-prints/` (add if missing)
3. Note expected L/W/D values in this file for comparison
