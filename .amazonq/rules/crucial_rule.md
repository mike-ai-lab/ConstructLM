# Crucial Rule: Avoid Duplicate Feature Additions

## Purpose
Ensure that when modifying the application code, no feature is added more than once. This prevents redundancy and potential errors.

## Rule
- Before adding any feature to the application:
  1. Check if the feature already exists in the relevant list, array, or registry.
  2. If the feature exists, do **not** add it again.
  3. If the feature does not exist, proceed with adding it.

## Enforcement
- Apply this rule to **all feature addition operations**, including:
  - Frontend components
  - Backend registries
  - Configuration files
- The AI model must automatically check for duplicates and skip any addition that would cause repetition.

## Notes
- Valid feature names must be non-empty strings.
- This rule is **mandatory** and overrides optional suggestions for adding features.
