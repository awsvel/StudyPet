# StudyPet

A Chrome study tracker with a virtual pet. No build step or account is required.

## Install and open

1. Go to `chrome://extensions` and enable **Developer mode**.
2. Select **Load unpacked** and choose the project folder containing
   `manifest.json`.
3. Pin StudyPet from Chrome's Extensions menu, then click its toolbar icon.

## Pet and shop

- Rename the pet with the pencil beside its name.
- Hunger drops from full to empty in about two minutes, even while the app is
  closed. At 30% or below, the hungry sprite appears. Food costs 10 coins and
  restores 25 hunger.
- Overdue, incomplete tasks reduce happiness by 10 points per overdue day.
- Buy accessories in the shop; purchases equip automatically. Only one item can
  be equipped at a time.

| Accessory | Cost |
| --- | ---: |
| Party Hat | 50 coins |
| Crown | 150 coins |
| Sunglasses | 75 coins |
| Bow | 60 coins |
| Wizard Hat | 200 coins |

## Tasks, timer, and rewards

Add a task with a class and name; notes and due date are optional. Mark tasks
complete, undo completion, or delete them. Active tasks are available in the
timer.

Select an active task and press **Start** to study. **Pause**/**Resume** controls
the timer; **Reset** clears it without saving. **Finish Session** saves the
session.

- Each completed 5-minute session block earns 5 coins and 10 EXP. Partial
  blocks earn no session rewards.
- Completing a task earns 50 coins and 100 EXP once. Early completion adds a
  bonus: 10 coins/20 EXP at least 1 day early, 25/50 at least 3 days early, or
  50/100 at least 7 days early.
- Study Session History lists saved sessions. Study Statistics shows time and
  session counts for today and this week, plus time by class.

## Floating window and data

Select **Pop out** to open the floating PiP window; the original app window is
minimized and must stay open. **Pop in** toggles the full app and pet-only view;
click the pet to return to the full view. Closing PiP restores the app window.
Chrome controls the window frame and resizing.

Pet state is saved in Chrome extension storage; tasks and sessions use browser
local storage. After updating the extension, close StudyPet windows, select
**Reload** at `chrome://extensions`, then reopen it. The toolbar icon uses
`assets/icon.png`.
