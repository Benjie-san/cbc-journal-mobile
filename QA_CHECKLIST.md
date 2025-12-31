QA Matrix Checklist

Legend: [ ] not tested  [x] pass  [!] fail

Devices / OS
- [x] Android 12/13 (mid-range)
- [x] Android 14 (newer)
- [x] Low-end device
- [x] Small screen + large screen
- [x] Physical device for notifications/Crashlytics

Network Conditions
- [x] Online stable
- [x] Offline at app start
- [x] Drop connection mid-save
- [x] Flaky connection (toggle airplane mode during sync)

Auth
- [x] Email sign up -> verify email -> login
- [x] Email login wrong password
- [x] Google sign-in (new user)
- [x] Google sign-in (existing user)
- [x] Email + Google account linking
- [x] Logout + log out everywhere (other device auto-logout)

Journal
- [x] Create, edit, autosave
- [x] Soft delete -> trash -> restore
- [x] Permanent delete
- [x] Conflict modal (two devices)

Offline-first
- [x] Create entry offline -> reconnect -> pull to sync
- [x] Update entry offline -> reconnect -> sync
- [x] No duplicate entries after sync

BRP
- [x] Year switching
- [x] Accordion month load
- [x] Tap passage -> editor with ref
- [x] Completed indicator reflects entry completion

Search & Tags
- [x] Search content
- [x] Tag filters
- [x] Tap result opens editor

Today's Passage
- [x] Button opens correct entry
- [x] "Entry Added" state updates

Streak
- [x] Increments once per day
- [x] Multiple entries same day doesn't increment
- [x] Offline day -> reconnect -> streak preserved

UI/UX
- [x] Dark/light mode consistency
- [x] Safe areas (no cutoffs)
- [x] Keyboard doesn't cover inputs in editor
