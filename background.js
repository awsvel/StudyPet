const HOST_WINDOW_KEY = "studyPetHostWindowId";

chrome.action.onClicked.addListener(async () => {
  const saved = await chrome.storage.session.get(HOST_WINDOW_KEY);
  if (saved[HOST_WINDOW_KEY] !== undefined) {
    try {
      await chrome.windows.update(saved[HOST_WINDOW_KEY], {
        focused: true,
        state: "normal",
      });
      return;
    } catch (error) {
      await chrome.storage.session.remove(HOST_WINDOW_KEY);
    }
  }

  const host = await chrome.windows.create({
    url: chrome.runtime.getURL("index.html"),
    type: "popup",
    width: 440,
    height: 620,
    focused: true,
  });
  await chrome.storage.session.set({ [HOST_WINDOW_KEY]: host.id });
});

chrome.windows.onRemoved.addListener(async (windowId) => {
  const saved = await chrome.storage.session.get(HOST_WINDOW_KEY);
  if (saved[HOST_WINDOW_KEY] === windowId) {
    await chrome.storage.session.remove(HOST_WINDOW_KEY);
  }
});

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.action === "minimizeStudyPetHost" && sender.tab?.windowId !== undefined) {
    chrome.windows.update(sender.tab.windowId, { state: "minimized" }).catch((error) => {
      console.error("Could not minimize the StudyPet host window:", error);
    });
  }

  if (message.action === "restoreStudyPetHost" && sender.tab?.windowId !== undefined) {
    chrome.windows.update(sender.tab.windowId, {
      focused: true,
      state: "normal",
    }).catch((error) => {
      console.error("Could not restore the StudyPet host window:", error);
    });
  }
});
