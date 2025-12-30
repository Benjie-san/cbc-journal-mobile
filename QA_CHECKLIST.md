QA Matrix Checklist

Legend: [ ] not tested  [x] pass  [!] fail

Devices / OS
- [ ] Android 12/13 (mid-range)
- [ ] Android 14 (newer)
- [ ] Low-end device
- [ ] Small screen + large screen
- [ ] Physical device for notifications/Crashlytics

Network Conditions
- [ ] Online stable
- [ ] Offline at app start
- [ ] Drop connection mid-save
- [ ] Flaky connection (toggle airplane mode during sync)

Auth
- [ ] Email sign up -> verify email -> login
- [ ] Email login wrong password
- [ ] Google sign-in (new user)
- [ ] Google sign-in (existing user)
- [ ] Email + Google account linking
- [ ] Logout + log out everywhere (other device auto-logout)

Journal
- [ ] Create, edit, autosave
- [ ] Soft delete -> trash -> restore
- [ ] Permanent delete
- [ ] Conflict modal (two devices)
- [ ] Version history + hard restore

Offline-first
- [ ] Create entry offline -> reconnect -> pull to sync
- [ ] Update entry offline -> reconnect -> sync
- [ ] No duplicate entries after sync

BRP
- [ ] Year switching
- [ ] Accordion month load
- [ ] Tap passage -> editor with ref
- [ ] Completed indicator reflects entry completion

Search & Tags
- [ ] Search content
- [ ] Tag filters
- [ ] Tap result opens editor

Today's Passage
- [ ] Button opens correct entry
- [ ] "Entry Added" state updates

Notifications
- [ ] Enable reminder
- [ ] Fires at set time
- [ ] Change time -> next trigger updates

Streak
- [ ] Increments once per day
- [ ] Multiple entries same day doesn't increment
- [ ] Offline day -> reconnect -> streak preserved

UI/UX
- [ ] Dark/light mode consistency
- [ ] Safe areas (no cutoffs)
- [ ] Keyboard doesn't cover inputs in editor
