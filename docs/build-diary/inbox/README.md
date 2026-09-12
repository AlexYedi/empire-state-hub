# Build-diary inbox

One file per build session. Sessions write here **instead of** editing
`src/data/changelog.ts` directly, so parallel threads never collide on the same file.

Filename: `YYYY-MM-DD-<8-char-session-id>.md`

Body: one or more candidate entries, each as

```
## YYYY-MM-DD — <title, 2-5 words>
<body: 1-2 sentences, past tense, describing the SHIFT that landed —
what the system can now do that it could not before. Not a task list.>
```

Match the register of the existing `CHANGELOG.entries` bodies: plain prose,
no marketing, no bullet lists, no emoji.

A later merge pass folds these into `src/data/changelog.ts` and clears the inbox.
