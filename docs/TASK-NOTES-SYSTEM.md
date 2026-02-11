# Task Notes System (PROD-036)

## Overview

The Task Notes system provides persistent, searchable, and versioned note-taking for tasks. Notes capture context about progress, blockers, outcomes, and decisions throughout a task's lifecycle.

## Data Model

### TaskNote Model

```prisma
model TaskNote {
  id        String   @id @default(cuid())
  taskId    String
  userId    String
  content   String   @db.Text
  noteType  String   @default("GENERAL") // GENERAL, COMPLETION, BLOCKER, PROGRESS
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  task      Task     @relation(fields: [taskId], references: [id], onDelete: Cascade)
  user      User     @relation(fields: [userId], references: [id])
}
```

### Note Types

- **GENERAL**: Default type for miscellaneous notes
- **COMPLETION**: Notes added when completing a task
- **BLOCKER**: Notes documenting blockers or issues
- **PROGRESS**: Progress updates and status changes

### Backward Compatibility

The existing `Task.completionNotes` field is preserved for backward compatibility. When a task is completed with completion notes:

1. The notes are saved to `Task.completionNotes` (legacy field)
2. A new `TaskNote` record is created with `noteType: 'COMPLETION'`

This ensures existing code continues to work while new features benefit from the versioned notes system.

## API Endpoints

### Get Task Notes

```
GET /api/tasks/[id]/notes
```

Returns all notes for a specific task, ordered by creation date (newest first).

**Response:**
```json
{
  "notes": [
    {
      "id": "note_123",
      "content": "Updated financial projections",
      "noteType": "PROGRESS",
      "createdAt": "2024-01-15T10:30:00Z",
      "user": {
        "id": "user_123",
        "name": "John Doe",
        "email": "john@example.com",
        "avatarUrl": null
      }
    }
  ]
}
```

### Add Task Note

```
POST /api/tasks/[id]/notes
```

Creates a new note for a task.

**Request Body:**
```json
{
  "content": "Note content here",
  "noteType": "PROGRESS" // Optional, defaults to GENERAL
}
```

**Response:**
```json
{
  "note": {
    "id": "note_123",
    "content": "Note content here",
    "noteType": "PROGRESS",
    "createdAt": "2024-01-15T10:30:00Z",
    "user": { ... }
  }
}
```

### Search Company Notes

```
GET /api/companies/[id]/notes?search=keyword&noteType=BLOCKER&limit=50
```

Search across all task notes for a company.

**Query Parameters:**
- `search` (optional): Search text (case-insensitive)
- `noteType` (optional): Filter by note type
- `limit` (optional): Max results (default: 50)

**Response:**
```json
{
  "notes": [...],
  "stats": [
    { "noteType": "GENERAL", "count": 10 },
    { "noteType": "COMPLETION", "count": 5 }
  ],
  "total": 15
}
```

## UI Components

### TaskNotes Component

Located at `src/components/actions/TaskNotes.tsx`

Displays a note history for a task with:
- Collapsible view (shows 3 most recent, expandable)
- Add note button
- Note type badges with color coding
- User attribution and timestamps
- Markdown-friendly text display

**Usage:**
```tsx
<TaskNotes
  taskId={task.id}
  taskTitle={task.title}
  disabled={isViewing}
/>
```

### AddNoteDialog Component

Modal dialog for creating new notes with:
- Note type selector
- Rich text area (markdown supported)
- Validation and error handling

### CompletedTaskRow Enhancement

Updated to show completion notes inline with expand/collapse functionality.

## Intelligence Layer Integration

The Company Intelligence Layer (`src/lib/intelligence/company-intelligence.ts`) aggregates notes from multiple sources:

1. **Assessment response notes** - Context from assessment questions
2. **Task completion notes** - Both legacy `completionNotes` field and new `TaskNote` records
3. **Weekly check-in notes** - Team changes, customer changes, additional notes

Notes are included in the AI context for:
- Question generation
- Task generation
- Dossier building
- Signal analysis

## Migration

### Backfilling Existing Notes

Run the migration script to convert existing `completionNotes` into `TaskNote` records:

```bash
npx tsx scripts/migrate-completion-notes-to-task-notes.ts
```

This script:
- Finds all completed tasks with non-empty `completionNotes`
- Creates `TaskNote` records with `noteType: 'COMPLETION'`
- Preserves the original field for backward compatibility
- Skips tasks that already have COMPLETION notes

## Permission Requirements

- **View notes**: Requires `TASK_VIEW` permission
- **Add notes**: Requires `TASK_UPDATE` permission
- **Search notes**: Requires `COMPANY_VIEW` permission

## Testing

### API Tests

- `src/app/api/tasks/[id]/notes/route.test.ts` - Task note CRUD operations
- `src/app/api/companies/[id]/notes/route.test.ts` - Company-wide search

### Component Tests

- `src/components/actions/TaskNotes.test.tsx` - Note display and interaction

Run tests:
```bash
npm run test:run -- TaskNotes
```

## Future Enhancements

1. **Rich text editor** - Upgrade from plain textarea to markdown editor with preview
2. **Note attachments** - Allow file attachments to notes
3. **Note mentions** - @mention team members in notes with notifications
4. **Note threading** - Reply to notes to create conversations
5. **Note templates** - Pre-defined note templates for common scenarios
6. **AI-generated summaries** - Automatically summarize long note threads
7. **Export notes** - Export all notes for a task or company as PDF/CSV

## Performance Considerations

- Notes are fetched per-task, not globally (avoids N+1 queries)
- Search endpoint has a default limit of 50 results
- Notes are ordered by creation date with database indexes
- Soft delete support (future) via `deletedAt` field

## Security

- All endpoints use permission checks via `checkPermission()`
- Notes are scoped to tasks, which are scoped to companies
- User attribution prevents note spoofing
- Input validation prevents XSS (text content, no HTML)
