// Toggle: "Pop out" moves the whole StudyPet window into an always-on-top
// Picture-in-Picture window. The pet card is pinned at the top and the timer,
// tasks and stats scroll underneath. "Pop in" closes it and moves everything
// back. This extension window must stay open while popped out.
(() => {
  const PIP_WIDTH = 420;
  const PIP_HEIGHT = 640;

  const button = document.getElementById("popOutButton");
  const petCard = document.getElementById("pet");
  if (!button || !petCard) return;

  if (!("documentPictureInPicture" in window)) {
    button.disabled = true;
    button.textContent = "Picture-in-Picture unavailable";
    return;
  }

  let pip = null;

  function setButtonState(isOut) {
    button.textContent = isOut ? "⧉ Pop in" : "⧉ Pop out";
  }

  function popIn() {
    if (pip) pip.close();
  }

  async function popOut() {
    try {
      pip = await window.documentPictureInPicture.requestWindow({
        width: PIP_WIDTH,
        height: PIP_HEIGHT,
      });
    } catch (error) {
      console.error("StudyPet pop out failed:", error);
      pip = null;
      return;
    }
    const win = pip;

    [...document.styleSheets].forEach((sheet) => {
      if (sheet.href) {
        const link = win.document.createElement("link");
        link.rel = "stylesheet";
        link.href = sheet.href;
        win.document.head.appendChild(link);
      }
    });

    // The same elements are moved (not copied) so the timer, forms and
    // stats keep working inside the floating window.
    const nodes = [...document.body.children].filter(
      (node) => node.tagName !== "SCRIPT"
    );
    const placeholder = document.createElement("p");
    placeholder.className = "pip-placeholder";
    placeholder.textContent = "StudyPet is floating. Click Pop in (or close the floating window) to bring it back.";

    win.document.body.className = "pip-body";
    nodes.forEach((node) => win.document.body.append(node));
    document.body.prepend(placeholder);
    setButtonState(true);

    // Chrome lets users resize PiP windows; snap back to the fixed size.
    win.addEventListener("resize", () => {
      if (win.innerWidth !== PIP_WIDTH || win.innerHeight !== PIP_HEIGHT) {
        try { win.resizeTo(PIP_WIDTH, PIP_HEIGHT); } catch (error) { /* not allowed */ }
      }
    });

    win.addEventListener("pagehide", () => {
      placeholder.remove();
      nodes.forEach((node) => document.body.append(node));
      pip = null;
      setButtonState(false);
      chrome.runtime.sendMessage({ action: "restoreStudyPetHost" }).catch((error) => {
        console.error("Could not restore StudyPet after closing PiP:", error);
      });
    });

    chrome.runtime.sendMessage({ action: "minimizeStudyPetHost" }).catch((error) => {
      console.error("Could not minimize the StudyPet launcher:", error);
    });
  }

  button.addEventListener("click", () => (pip ? popIn() : popOut()));
})();
