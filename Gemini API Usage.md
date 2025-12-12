# filename: dashboard_summary.md
# Monitoring Dashboard Summary

**Project:** ConstructLM-1
**Time Range:** Last Hour (approximately 12:20 PST - 13:00 PST)

---

## Overview

### Total API Requests per minute

*   **Description:** This graph tracks the total number of API requests received per minute.
*   **Observations:**
    *   Multiple request spikes are visible throughout the hour.
    *   Peak requests occurred around:
        *   12:30 PST: 1 request
        *   12:40 PST: 2 requests (highest peak)
        *   12:50 PST: 1 request
        *   13:00 PST: 1 request
    *   Baseline for most of the period is 0 requests.
*   **Metric:** Total API Requests

### Total API Errors per minute

*   **Description:** This graph displays the total number of API errors per minute.
*   **Observations:**
    *   Error spikes closely correlate with the request spikes, indicating errors occurred when requests were made.
    *   Peak errors occurred around:
        *   12:30 PST: 1 error
        *   12:40 PST: 2 errors (highest peak)
        *   12:50 PST: 1 error
        *   13:00 PST: 1 error
    *   All observed errors are `429 TooManyRequests`.
*   **Metric:** 429 TooManyRequests

---

## Generate Content

**Model:** All Models (data specifically for `gemini-2.5-flash`)

### Input Tokens per minute

*   **Description:** This graph shows the number of input tokens processed per minute for content generation using `gemini-2.5-flash`.
*   **Observations:**
    *   A single, significant spike in input tokens occurred around 12:40 PST.
    *   At this peak, approximately 90-100 input tokens were processed.
    *   Outside of this spike, input token usage was 0.
*   **Metric:** gemini-2.5-flash (Input Tokens)

### Requests per minute

*   **Description:** This graph shows the number of content generation requests per minute for `gemini-2.5-flash`.
*   **Observations:**
    *   A single request spike is observed around 12:40 PST.
    *   At this peak, 1 request was made.
    *   Outside of this spike, content generation requests were 0.
*   **Metric:** gemini-2.5-flash (Requests)
