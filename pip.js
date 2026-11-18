// The extension window must stay open while Picture-in-Picture is active.
(() => {
  const PIP_WIDTH = 420;
  const PIP_HEIGHT = 640;
  const PET_WIDTH = 200;
  const PET_HEIGHT = 270;

  const button = document.getElementById("popOutButton");
  const petImage = document.getElementById("pet-sprite");
  const status = document.getElementById("pipStatus");
  if (!button || !petImage || !status) return;

  if (!("documentPictureInPicture" in window)) {
    button.disabled = true;
    button.textContent = "Picture-in-Picture unavailable";
    return;
  }

  let pip = null;
  let compact = false;
  let floatingNodes = [];
  let petButton = null;

  function setButtonState(isOut) {
    button.textContent = isOut ? "⧉ Pop in" : "⧉ Pop out";
  }

  function setCompact(isCompact) {
    compact = isCompact;
    pip.document.body.classList.toggle("pip-compact", isCompact);
    floatingNodes.forEach((node) => {
      node.hidden = isCompact;
    });
    petButton.hidden = !isCompact;

    try {
      pip.resizeTo(
        isCompact ? PET_WIDTH : PIP_WIDTH,
        isCompact ? PET_HEIGHT : PIP_HEIGHT
      );
    } catch (error) {
      console.error("Could not resize the StudyPet floating window:", error);
    }
  }

  async function popOut() {
    status.textContent = "";
    try {
      pip = await window.documentPictureInPicture.requestWindow({
        width: PIP_WIDTH,
        height: PIP_HEIGHT,
      });
    } catch (error) {
      console.error("StudyPet pop out failed:", error);
      status.textContent = "Could not open the floating window. Please try again.";
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
    const petImageUrl = petImage.src;
    floatingNodes = [...document.body.children].filter(
      (node) => node.tagName !== "SCRIPT"
    );
    const placeholder = document.createElement("p");
    placeholder.className = "pip-placeholder";
    placeholder.textContent = "StudyPet is floating. Close the floating window to bring it back here.";

    win.document.body.className = "pip-body";
    floatingNodes.forEach((node) => win.document.body.append(node));
    petButton = win.document.createElement("button");
    petButton.type = "button";
    petButton.className = "pip-pet-button";
    petButton.hidden = true;
    petButton.setAttribute("aria-label", "Open StudyPet");
    const image = win.document.createElement("img");
    image.src = petImageUrl;
    image.alt = "";
    petButton.append(image);
    petButton.addEventListener("click", () => setCompact(false));
    win.document.body.append(petButton);
    document.body.prepend(placeholder);
    setButtonState(true);

    win.addEventListener("pagehide", () => {
      placeholder.remove();
      floatingNodes.forEach((node) => {
        node.hidden = false;
        document.body.append(node);
      });
      floatingNodes = [];
      petButton = null;
      compact = false;
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

  button.addEventListener("click", () => (pip ? setCompact(!compact) : popOut()));
})();
