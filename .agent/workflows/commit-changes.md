---
description: Commit and push changes to GitHub
---

# Commit and Push Changes to GitHub

This workflow commits all changes and pushes them to the GitHub repository.

## Steps

1. **Stage all changes**
```bash
git add -A
```

2. **Commit with descriptive message**
```bash
git commit -m "[COMMIT_MESSAGE]"
```

3. **Push to GitHub**
```bash
git push origin main
```

## Usage Notes

- Replace `[COMMIT_MESSAGE]` with a descriptive message about what changed
- This workflow should be run after completing any feature or fix
- Ensure all changes are tested before committing
