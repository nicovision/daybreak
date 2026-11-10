# Project notes

## Design decisions

Daybreak treats the board as a personal focus space. Warm paper tones and forest green frame the workspace; column indicators, categories, priorities, and due dates use restrained secondary colors. A progress summary makes movement visible without competing with the tasks. Empty states provide a clear next action. Sample data is confined to the labeled local demo.

The implementation uses a React single-page app and Supabase directly, keeping hosting simple and avoiding an unnecessary backend service. A repository interface keeps demo persistence separate from cloud persistence. Database policies enforce ownership even when requests are made outside the interface. Existing browser sessions are reused; no email or password is needed.

## Implemented extras

- Editable task details and confirmed deletion.
- Description, priority, due date, and a fixed set of categories.
- Title and description search.
- Priority/category filters, overdue view, and sorting by creation, priority, or due date.
- Overdue/today indicators and board summary statistics.
- Responsive board and alternative status controls for keyboard/touch use.

Categories are a fixed single choice, not a custom multi-label system. There are no assignees, comments, collaborative boards, or activity logs in this version.

## Tradeoffs and next improvements

- On-drop persistence is used instead of multi-client realtime synchronization. Reload to retrieve changes made in another cloud tab.
- Writes are serialized. Drag-and-drop moves appear immediately, then roll back with an error if persistence fails; other edits appear after confirmation.
- Tasks are sorted rather than freely ordered inside a column. An explicit position field would support custom ordering.
- Guest sessions depend on browser storage. Account conversion would provide recovery across browsers.
- Anonymous sign-in rate limiting and bot protection should be reviewed before sharing a widely accessible demo. Supabase supports CAPTCHA; a complete CAPTCHA flow is not included.
- The app uses Google Fonts with system fallbacks. Bundled fonts could remove the external font dependency.
- The live RLS check and hosted smoke tests passed. Further work could include a formal accessibility audit and automated end-to-end browser tests.

## Verification status

Automated local tests and a TypeScript/production build are included. Local browser checks cover creation, reload persistence, editing/status changes, search, and dragging. The local app is connected to Supabase. The live integration check passed on November 10, 2026: guest creation, persisted owner updates, cross-user read/update/delete isolation, ownership spoofing prevention, and unauthenticated access restrictions. Its test tasks were cleaned up; two test guest auth records remain. The source is hosted in nicovision/daybreak on GitHub, and the frontend is deployed to Cloudflare Pages. The hosted app passed guest sign-in, task creation, drag-and-drop, reload persistence, search, and phone-layout checks on November 10, 2026.

## Remaining setup

1. Completed: connected Supabase project with anonymous sign-in.
2. Completed: verified the supplied schema through live task operations and configured the local environment.
3. Completed: ran the live guest isolation and persistence check. Recheck the hosted app in separate browsers after deployment.
4. Completed: pushed source to nicovision/daybreak with environment files and the assessment PDF excluded.
5. Completed: deployed to Cloudflare Pages with the public Supabase connection values configured.
6. Completed: checked hosted guest creation, drag persistence, search, and phone layout. Save-error handling is covered by automated local tests.
7. Completed: prepared the submission PDF and editable DOCX separately from this repository. Add the full name and rename the file before submitting.
8. Review the implementation and any separate employer rules on assistance, then submit through the requested Drive/Form flow.

Do not include the assessment PDF in the source repository. Do not publicly promote the submission link. This file is development documentation, not a completed submission document.
