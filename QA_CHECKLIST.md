QA Matrix Checklist

Legend: [ ] not tested  [x] pass  [!] fail

Devices / OS
- [ ] Android 12/13 (mid-range)
- [ ] Android 14 (newer)
- [ ] Low-end device
- [ ] Small screen + large screen
- [x] Physical device for notifications/Crashlytics

Network Conditions
- [ ] Online stable
- [x] Offline at app start
- [ ] Drop connection mid-save
- [ ] Flaky connection (toggle airplane mode during sync)

Auth
- [x] Email sign up -> verify email -> login
- [x] Email login wrong password
- [x] Google sign-in (new user)
- [x] Google sign-in (existing user)
- [x] Email + Google account linking
- [x] Logout + log out everywhere (other device auto-logout)

Journal
- [x] Create, edit, autosave
- [] Soft delete -> trash -> restore
- [x] Permanent delete
- [ ] Conflict modal (two devices)
- [ ] Version history + hard restore

Offline-first
- [x] Create entry offline -> reconnect -> pull to sync
- [x] Update entry offline -> reconnect -> sync
- [ ] No duplicate entries after sync

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
