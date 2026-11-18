(() => {
  // Pet elements can live in the Picture-in-Picture document while popped out.
  const $ = (id) =>
    document.getElementById(id) ||
    (window.documentPictureInPicture &&
      window.documentPictureInPicture.window &&
      window.documentPictureInPicture.window.document.getElementById(id));

  let shopBusy = false;

  function renderShop(state) {
    const inventory = state.inventory || [];
    const list = $("shopList");
    list.replaceChildren();

    SHOP_ITEMS.forEach((item) => {
      const owned = inventory.includes(item.id);
      const equipped = state.equipped === item.id;
      const row = list.ownerDocument.createElement("li");
      row.className = "shop-item";
      const name = list.ownerDocument.createElement("span");
      name.textContent = `${item.icon} ${item.name}`;
      const button = list.ownerDocument.createElement("button");
      button.type = "button";
      const action = equipped ? "Unequip" : owned ? "Equip" : "Buy";
      button.textContent = owned ? action : `Buy (${item.cost} 🪙)`;
      button.className = equipped ? "secondary" : owned ? "success" : "";
      button.setAttribute("aria-label", `${action} ${item.name}${owned ? "" : ` for ${item.cost} coins`}`);
      button.disabled = shopBusy || (!owned && state.coins < item.cost);
      button.addEventListener("click", async () => {
        if (shopBusy) return;
        shopBusy = true;
        list.querySelectorAll("button").forEach((control) => { control.disabled = true; });
        try {
          const result = owned
            ? await StudyPet.equipItem(equipped ? null : item.id)
            : await StudyPet.buyItem(item.id);
          $("shopMessage").textContent = result.ok
            ? (equipped ? `Unequipped ${item.name}.` : `${item.name} equipped.`)
            : result.reason;
        } catch (error) {
          console.error("Could not update the shop:", error);
          $("shopMessage").textContent = "Could not update the shop. Please try again.";
        } finally {
          shopBusy = false;
          await renderPet();
        }
      });
      row.append(name, button);
      list.append(row);
    });
  }

  function moodFor(hunger, happiness) {
    if (happiness <= 33) return "Unhappy";
    if (hunger <= 33) return "Starving";
    if (hunger <= 66 || happiness <= 66) return "Hungry";
    return "Happy";
  }

  function renderSprite(state) {
    const equipped = SHOP_ITEMS.find((item) => item.id === state.equipped);
    const spriteName = state.hunger <= 30
      ? equipped ? `pet_hungry_${equipped.sprite}` : "pet_hungry"
      : equipped ? `pet_${equipped.sprite}` : "pet";
    const spriteUrl = new URL(`assets/${spriteName}.png`, document.baseURI).href;
    const documents = [document];
    if (window.documentPictureInPicture && window.documentPictureInPicture.window) {
      documents.push(window.documentPictureInPicture.window.document);
    }
    documents.forEach((doc) => {
      doc.querySelectorAll("#pet-sprite, .pip-pet-button img").forEach((image) => {
        image.src = spriteUrl;
      });
    });
  }

  function renderHunger(state) {
    const happiness = StudyPet.calculateHappiness(tasks);
    $("hunger-bar").value = state.hunger;
    $("happiness-bar").value = happiness;
    renderSprite(state);
    $("pet-mood").textContent = moodFor(state.hunger, happiness);
  }

  async function renderPet() {
    const s = await StudyPet.getState();
    $("pet-name").textContent = s.petName || "Pet";
    $("coins").textContent = Math.floor(s.coins);
    $("food").textContent = s.food;
    $("streak").textContent = s.currentStreak || 0;
    const info = getLevelInfo(s.exp);
    $("level").textContent = info.level;
    $("exp-bar").max = info.expForNext;
    $("exp-bar").value = info.expIntoLevel;
    $("exp-text").textContent = `${info.expIntoLevel} / ${info.expForNext}`;
    renderHunger(s);
    $("food-cost").textContent = FOOD_COST;
    renderShop(s);
  }

  async function act(action) {
    const result = await action();
    $("message").textContent = result.ok ? "" : result.reason;
    renderPet();
  }

  async function reward(run, label) {
    const before = getLevelInfo((await StudyPet.getState()).exp).level;
    const r = await run();
    const after = getLevelInfo((await StudyPet.getState()).exp).level;
    $("message").textContent = `${label}: +${r.coins} coins, +${r.exp} exp` +
      (r.earlyBonusExp ? ` (includes +${r.earlyBonusExp} early EXP bonus)` : "") +
      (after > before ? ` — Level up! Now level ${after} 🎉` : "");
  }

  $("buy-food").addEventListener("click", () => act(() => StudyPet.buyFood()));
  $("feed").addEventListener("click", () => act(() => StudyPet.feed()));

  $("edit-pet-name").addEventListener("click", () => {
    $("pet-name-input").value = $("pet-name").textContent.trim();
    $("message").textContent = "";
    $("pet-name-form").hidden = false;
    $("edit-pet-name").hidden = true;
    $("pet-name-input").focus();
    $("pet-name-input").select();
  });
  $("cancel-pet-name").addEventListener("click", () => {
    $("pet-name-form").hidden = true;
    $("edit-pet-name").hidden = false;
    $("message").textContent = "";
  });
  $("pet-name-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const name = $("pet-name-input").value.trim();
    if (!name) {
      $("message").textContent = "Please enter a name for your pet.";
      $("pet-name-input").focus();
      return;
    }

    const saveButton = $("pet-name-form").querySelector('button[type="submit"]');
    saveButton.disabled = true;
    try {
      await StudyPet.update((state) => { state.petName = name; });
      $("pet-name-form").hidden = true;
      $("edit-pet-name").hidden = false;
      $("message").textContent = "";
      await renderPet();
    } catch (error) {
      console.error("Could not save pet name:", error);
      $("message").textContent = "Could not save pet name. Please try again.";
    } finally {
      saveButton.disabled = false;
    }
  });

  // Olly's timer/tasks dispatch these events with the saved session/task.
  window.addEventListener("studySessionsUpdated", (e) => {
    if (e.detail && e.detail.session) {
      reward(() => StudyPet.rewardSession(e.detail.session), "Session reward");
    }
  });
  window.addEventListener("taskCompleted", (e) => {
    reward(() => StudyPet.rewardTask(e.detail.task), "Assignment turned in");
  });
  window.addEventListener("tasksUpdated", renderPet);

  chrome.storage.onChanged.addListener(renderPet);
  StudyPet.update(() => {}).then(renderPet).catch((error) => {
    console.error("Could not initialize StudyPet:", error);
    $("message").textContent = "Could not load pet state. Please reopen StudyPet.";
  });
  window.setInterval(() => {
    StudyPet.getState().then(renderHunger).catch((error) => {
      console.error("Could not refresh pet hunger:", error);
    });
  }, 1000);
})();
