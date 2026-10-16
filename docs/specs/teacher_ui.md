# Teacher Tribute UI/UX Specification

## Overview
Refining the Teachers Corner to match the Balik Baleno design language, using a card-based layout for the directory and detail pages.

## Directory Page (`/teachers`)
- **Card-Based Layout:** Responsive grid using Tailwind CSS.
- **Teacher Card:**
  - Name: Bold, primary text.
  - Subject: Muted text.
  - Note Count: Small badge indicating activity.
  - Interaction: Full card click target.
- **Search:** A search input filters the visible teachers by name or subject (case-insensitive, partial match), applied as the user types.
- **Subject Filter:** A `<select>` listing every subject present in the data plus an "All subjects" option. Options are rendered on the server; the client applies the selection.
- **Pagination:** Results are paged client-side (see `TEACHER_PAGE_SIZE`). Controls page through the filtered results; the page controls reset to page 1 whenever the search or filter changes.
- **No-JavaScript fallback:** the server renders the full list, so every teacher is still reachable when scripts are unavailable.

## Detail Page (`/teachers/[teacherId]`)
- **Header:** Teacher Name and Subject, with "Back to all teachers" link.
- **Form:** Styled contribution card for posting notes.
- **Notes List:** Individual cards for each note, displaying user/date info.
