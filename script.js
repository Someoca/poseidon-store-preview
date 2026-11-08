const platforms = [
  { id: "homebrew", name: "HOMEBREW", glyph: "HB" },
  { id: "ps3", name: "PLAYSTATION 3", glyph: "PS3" },
  { id: "psone", name: "PS ONE", glyph: "PS" },
  { id: "ps2", name: "PLAYSTATION 2", glyph: "PS2" },
  { id: "ps4", name: "PLAYSTATION 4", glyph: "PS4" },
];

document.addEventListener("DOMContentLoaded", async () => {
  const store = document.querySelector("#store");
  const platformView = document.querySelector("#platform-view");
  const libraryView = document.querySelector("#library-view");
  const platformRail = document.querySelector("#platform-rail");
  const platformSelected = document.querySelector("#platform-selected");
  const coverRail = document.querySelector("#cover-rail");
  const title = document.querySelector("#featured-title");
  const description = document.querySelector("#featured-description");
  const counter = document.querySelector("#featured-counter");
  const empty = document.querySelector("#library-empty");
  const searchBox = document.querySelector("#search-box");
  const searchInput = document.querySelector("#search-input");
  const categoryMenu = document.querySelector("#category-menu");
  const categoriesButton = document.querySelector("#categories-button");
  const detailsDialog = document.querySelector("#details-dialog");
  const toast = document.querySelector("#toast");
  let catalog = [];
  let platformIndex = 4;
  let selectedPlatform = platforms[platformIndex];
  let activeIndex = 0;
  let visibleItems = [];
  let activeCategory = "Tudo";
  let query = "";
  let toastTimer;

  try {
    const response = await fetch("catalog/catalog.json");
    if (!response.ok) throw new Error("Manifesto indisponível");
    const data = await response.json();
    catalog = Array.isArray(data.items) ? data.items.filter(isValidItem).map(normalizeItem) : [];
  } catch {
    catalog = [];
    showToast("O catálogo não carregou. Abra o projeto pelo servidor local.");
  }

  function isValidItem(item) {
    return item && typeof item.id === "string" && typeof item.name === "string" &&
      Array.isArray(item.platforms) && item.platforms.length > 0 &&
      item.platforms.every((platform) => platforms.some((entry) => entry.id === platform));
  }

  function normalizeItem(item) {
    const colors = Array.isArray(item.colors) && item.colors.length >= 2 &&
      item.colors.slice(0, 2).every((color) => typeof color === "string" && /^#[\da-f]{6}$/i.test(color))
      ? item.colors.slice(0, 2)
      : ["#188cb4", "#142856"];
    return {
      ...item,
      category: typeof item.category === "string" && item.category.trim() ? item.category : (item.platforms.includes("homebrew") ? "Aplicativos" : "Jogos"),
      description: typeof item.description === "string" ? item.description : "",
      colors,
    };
  }

  function safeAssetUrl(value) {
    if (typeof value !== "string" || !value.trim()) return "";
    try {
      const asset = new URL(value, window.location.href);
      if (asset.protocol === "https:" && !asset.username && !asset.password) return asset.href;
      if (asset.origin === window.location.origin && value.startsWith("assets/") && !value.split("/").includes("..")) return value;
    } catch { /* Invalid asset path: keep the generated Poseidon artwork. */ }
    return "";
  }

  function safeExternalUrl(value) {
    if (typeof value !== "string") return "";
    try {
      const url = new URL(value);
      return url.protocol === "https:" && !url.username && !url.password ? url.href : "";
    } catch { return ""; }
  }

  function makePlatformCard(platform, index) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "platform-card";
    button.dataset.platform = platform.id;
    button.setAttribute("aria-pressed", String(index === platformIndex));
    button.setAttribute("aria-label", `${platform.name}${index === platformIndex ? ", selecionada" : ""}`);
    const glyph = document.createElement("span");
    glyph.className = "platform-glyph";
    glyph.textContent = platform.glyph;
    const name = document.createElement("span");
    name.className = "platform-name";
    name.textContent = platform.name;
    button.append(glyph, name);
    button.addEventListener("focus", () => setPlatform(index));
    button.addEventListener("click", () => { setPlatform(index); openLibrary(); });
    button.addEventListener("mouseenter", () => setPlatform(index));
    return button;
  }

  function renderPlatforms() {
    platformRail.replaceChildren(...platforms.map(makePlatformCard));
    setPlatform(platformIndex);
  }

  function setPlatform(index) {
    platformIndex = (index + platforms.length) % platforms.length;
    selectedPlatform = platforms[platformIndex];
    platformRail.querySelectorAll(".platform-card").forEach((card, cardIndex) => {
      const isSelected = cardIndex === platformIndex;
      card.classList.toggle("is-selected", isSelected);
      card.setAttribute("aria-pressed", String(isSelected));
      card.setAttribute("aria-label", `${platforms[cardIndex].name}${isSelected ? ", selecionada" : ""}`);
    });
    platformSelected.textContent = `${selectedPlatform.name}  ·  PRESSIONE × PARA ENTRAR`;
  }

  function openLibrary() {
    platformView.classList.remove("is-visible");
    platformView.hidden = true;
    libraryView.hidden = false;
    libraryView.classList.add("is-visible");
    store.dataset.view = "library";
    document.querySelector("#platform-label").textContent = `BIBLIOTECA ${selectedPlatform.name}`;
    document.querySelector("#library-title").innerHTML = `${selectedPlatform.id === "homebrew" ? "APLICATIVOS" : "JOGOS"} <span>EM DESTAQUE</span>`;
    activeCategory = "Tudo";
    query = "";
    searchInput.value = "";
    closeSearch();
    closeCategories();
    renderCategories();
    renderLibrary();
    document.querySelector("#control-hints").innerHTML =
      '<span><kbd class="key-circle key-l1">L1</kbd><b>Anterior</b></span><span><kbd class="key-circle key-x">×</kbd><b>Detalhes</b></span><span><kbd class="key-circle key-triangle">△</kbd><b>Pesquisar</b></span><span><kbd class="key-circle key-circle-button">○</kbd><b>Voltar</b></span><span><kbd class="key-circle key-square">□</kbd><b>Categorias</b></span><span><kbd class="key-circle key-r1">R1</kbd><b>Próximo</b></span>';
    document.querySelector("#cover-rail").focus?.();
  }

  function closeLibrary() {
    if (detailsDialog.open) { detailsDialog.close(); return; }
    if (!categoryMenu.hidden) { closeCategories(); return; }
    if (!searchBox.hidden) { closeSearch(); return; }
    libraryView.classList.remove("is-visible");
    libraryView.hidden = true;
    platformView.hidden = false;
    platformView.classList.add("is-visible");
    store.dataset.view = "platform";
    document.querySelector("#control-hints").innerHTML =
      '<span><kbd class="key-circle key-x">×</kbd><b>Selecionar</b></span><span><kbd class="key-circle key-circle-button">○</kbd><b>Voltar</b></span>';
    platformRail.querySelector(`[data-platform="${selectedPlatform.id}"]`)?.focus();
  }

  function renderCategories() {
    const available = [...new Set(catalog.filter((item) => item.platforms.includes(selectedPlatform.id)).map((item) => item.category))];
    const categoryOptions = ["Tudo", ...(available.length ? available : ["Jogos", "Aplicativos", "Emuladores"])];
    if (!categoryOptions.includes(activeCategory)) activeCategory = "Tudo";
    categoryMenu.replaceChildren(...categoryOptions.map((category) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `category-chip${category === activeCategory ? " is-active" : ""}`;
      button.textContent = category;
      button.setAttribute("aria-pressed", String(category === activeCategory));
      button.addEventListener("click", () => { activeCategory = category; closeCategories(); renderCategories(); renderLibrary(); });
      return button;
    }));
  }

  function renderLibrary() {
    visibleItems = catalog.filter((item) => {
      const platformMatches = item.platforms.includes(selectedPlatform.id);
      const categoryMatches = activeCategory === "Tudo" || item.category === activeCategory;
      const haystack = normalize(`${item.name} ${item.description} ${item.category}`);
      return platformMatches && categoryMatches && (!query || haystack.includes(normalize(query)));
    });
    activeIndex = Math.min(activeIndex, Math.max(0, visibleItems.length - 1));
    coverRail.replaceChildren(...visibleItems.map(makeCover));
    coverRail.hidden = visibleItems.length === 0;
    document.querySelector("#carousel-stage").hidden = visibleItems.length === 0;
    empty.hidden = visibleItems.length > 0;
    empty.innerHTML = "<p>Este catálogo está vazio. Os itens serão exibidos quando suas capas, licenças e fontes de distribuição forem confirmadas.</p>";
    if (!visibleItems.length) {
      title.textContent = "CATÁLOGO EM PREPARAÇÃO";
      description.textContent = "Selecione outra plataforma ou volte para escolher uma biblioteca.";
      counter.textContent = "0 ITENS";
      return;
    }
    setActive(activeIndex);
  }

  function makeCover(item, index) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "cover-card";
    button.dataset.index = String(index);
    button.style.setProperty("--cover-a", item.colors[0]);
    button.style.setProperty("--cover-b", item.colors[1]);
    button.setAttribute("aria-label", `${item.name}, ${item.category}`);
    button.setAttribute("aria-current", String(index === activeIndex));
    const logo = document.createElement("span");
    logo.className = "cover-logo";
    logo.textContent = `${item.preview ? "PRÉVIA" : "HOME BREW"} · ${selectedPlatform.id.toUpperCase()}`;
    const art = document.createElement("span");
    art.className = "cover-art";
    art.setAttribute("aria-hidden", "true");
    const figure = document.createElement("span");
    figure.className = "cover-figure";
    const coverUrl = safeAssetUrl(item.cover);
    if (coverUrl) {
      art.classList.add("has-cover");
      const image = document.createElement("img");
      image.className = "cover-image";
      image.src = coverUrl;
      image.alt = "";
      image.loading = "lazy";
      image.addEventListener("error", () => { image.remove(); art.classList.remove("has-cover"); }, { once: true });
      art.append(image);
    } else {
      art.append(figure);
    }
    const coverTitle = document.createElement("span");
    coverTitle.className = "cover-title";
    coverTitle.textContent = item.name;
    button.append(logo, art, coverTitle);
    button.addEventListener("focus", () => setActive(index));
    button.addEventListener("click", () => { setActive(index); showDetails(); });
    button.addEventListener("mouseenter", () => setActive(index));
    return button;
  }

  function setActive(index) {
    if (!visibleItems.length) return;
    activeIndex = (index + visibleItems.length) % visibleItems.length;
    const item = visibleItems[activeIndex];
    coverRail.querySelectorAll(".cover-card").forEach((card, cardIndex) => {
      const selected = cardIndex === activeIndex;
      card.classList.toggle("is-selected", selected);
      card.setAttribute("aria-current", String(selected));
    });
    title.textContent = item.name;
    description.textContent = item.description;
    counter.textContent = `${String(activeIndex + 1).padStart(2, "0")} / ${String(visibleItems.length).padStart(2, "0")}`;
    store.style.setProperty("--active-a", item.colors[0]);
    store.style.setProperty("--active-b", item.colors[1]);
    const backdrop = document.querySelector(".backdrop");
    const backgroundUrl = safeAssetUrl(item.background);
    backdrop.style.background = backgroundUrl
      ? `linear-gradient(90deg,rgba(2,11,28,.45),rgba(2,11,28,.08)),url(${JSON.stringify(backgroundUrl)}) center/cover`
      : `radial-gradient(ellipse at 50% 39%,${item.colors[0]}99 0,transparent 47%),radial-gradient(ellipse at 80% 78%,${item.colors[1]}88 0,transparent 38%),linear-gradient(125deg,#06142b,#0a3677 50%,#020b1c)`;
  }

  function showDetails() {
    const item = visibleItems[activeIndex];
    if (!item) return;
    document.querySelector("#dialog-title").textContent = item.name;
    document.querySelector("#dialog-description").textContent = item.description;
    document.querySelector("#dialog-category").textContent = item.category;
    document.querySelector("#dialog-platform").textContent = selectedPlatform.name;
    document.querySelector("#dialog-availability").textContent = item.releaseUrl ? "Download no projeto oficial" : "Prévia visual";
    document.querySelector("#dialog-notice").hidden = !item.preview;
    const downloadLink = document.querySelector("#dialog-download");
    const downloadUrl = safeExternalUrl(item.releaseUrl);
    downloadLink.hidden = !downloadUrl;
    if (downloadUrl) downloadLink.href = downloadUrl;
    const sourceLink = document.querySelector("#dialog-source");
    const sourceUrl = safeExternalUrl(item.sourceUrl);
    sourceLink.hidden = !sourceUrl;
    if (sourceUrl) sourceLink.href = sourceUrl;
    const art = document.querySelector("#dialog-art");
    art.style.setProperty("--dialog-a", item.colors[0]);
    art.style.setProperty("--dialog-b", item.colors[1]);
    art.replaceChildren();
    const coverUrl = safeAssetUrl(item.cover);
    if (coverUrl) {
      const image = document.createElement("img");
      image.className = "dialog-cover-image";
      image.src = coverUrl;
      image.alt = `Capa de ${item.name}`;
      image.addEventListener("error", () => image.remove(), { once: true });
      art.append(image);
    }
    detailsDialog.showModal();
    document.querySelector(".dialog-close").focus();
  }

  function toggleSearch() {
    if (searchBox.hidden) { searchBox.hidden = false; searchInput.focus(); }
    else closeSearch();
  }
  function closeSearch() { searchBox.hidden = true; searchInput.blur(); }
  function toggleCategories() {
    categoryMenu.hidden = !categoryMenu.hidden;
    categoriesButton.setAttribute("aria-expanded", String(!categoryMenu.hidden));
    if (!categoryMenu.hidden) categoryMenu.querySelector("button")?.focus();
  }
  function closeCategories() { categoryMenu.hidden = true; categoriesButton.setAttribute("aria-expanded", "false"); }
  function normalize(text) { return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR"); }
  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2600);
  }

  platformRail.addEventListener("keydown", (event) => {
    if (event.key === "ArrowRight") { event.preventDefault(); setPlatform(platformIndex + 1); platformRail.children[platformIndex].focus(); }
    if (event.key === "ArrowLeft") { event.preventDefault(); setPlatform(platformIndex - 1); platformRail.children[platformIndex].focus(); }
    if (event.key === "Enter" || event.key === " ") { event.preventDefault(); event.stopPropagation(); openLibrary(); }
  });
  coverRail.addEventListener("keydown", (event) => {
    if (event.key === "ArrowRight") { event.preventDefault(); event.stopPropagation(); setActive(activeIndex + 1); coverRail.children[activeIndex]?.focus(); }
    if (event.key === "ArrowLeft") { event.preventDefault(); event.stopPropagation(); setActive(activeIndex - 1); coverRail.children[activeIndex]?.focus(); }
    if (event.key === "Enter" || event.key === " ") { event.preventDefault(); event.stopPropagation(); showDetails(); }
  });
  document.querySelector("#previous-button").addEventListener("click", () => setActive(activeIndex - 1));
  document.querySelector("#next-button").addEventListener("click", () => setActive(activeIndex + 1));
  document.querySelector("#back-button").addEventListener("click", closeLibrary);
  document.querySelector("#categories-button").addEventListener("click", toggleCategories);
  searchInput.addEventListener("input", () => { query = searchInput.value.trim(); activeIndex = 0; renderLibrary(); });
  document.querySelector(".dialog-close").addEventListener("click", () => detailsDialog.close());
  detailsDialog.addEventListener("click", (event) => { if (event.target === detailsDialog) detailsDialog.close(); });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (detailsDialog.open) detailsDialog.close();
      else closeLibrary();
      return;
    }
    if (detailsDialog.open || categoryMenu.contains(event.target)) return;
    if (event.target instanceof HTMLInputElement) return;
    if (!libraryView.classList.contains("is-visible")) return;
    if (event.key === "ArrowRight") setActive(activeIndex + 1);
    if (event.key === "ArrowLeft") setActive(activeIndex - 1);
    if (event.key.toLowerCase() === "x" || event.key === "Enter") showDetails();
    if (event.key.toLowerCase() === "o") closeLibrary();
    if (event.key.toLowerCase() === "q") setActive(activeIndex - 1);
    if (event.key.toLowerCase() === "e") setActive(activeIndex + 1);
    if (event.key === "ArrowUp") toggleSearch();
    if (event.key.toLowerCase() === "f") toggleCategories();
  });

  const gamepadButtons = new Map();
  let lastAxisMove = 0;
  let running = false;
  function pollGamepads() {
    if (!running) return;
    const pad = [...(navigator.getGamepads?.() || [])].find((gamepad) => gamepad?.connected);
    if (pad) {
      const pressed = (index) => Boolean(pad.buttons[index]?.pressed);
      const justPressed = (index) => pressed(index) && !gamepadButtons.get(index);
      const now = performance.now();
      if (pad.axes[0] > .65 && now - lastAxisMove > 240) { setActive(activeIndex + 1); lastAxisMove = now; }
      else if (pad.axes[0] < -.65 && now - lastAxisMove > 240) { setActive(activeIndex - 1); lastAxisMove = now; }
      else if (justPressed(14) || justPressed(12)) { if (!libraryView.classList.contains("is-visible")) setPlatform(platformIndex - 1); else setActive(activeIndex - 1); }
      else if (justPressed(15) || justPressed(13)) { if (!libraryView.classList.contains("is-visible")) setPlatform(platformIndex + 1); else setActive(activeIndex + 1); }
      if (justPressed(0)) { if (!libraryView.classList.contains("is-visible")) openLibrary(); else showDetails(); }
      if (justPressed(1)) closeLibrary();
      if (justPressed(2)) toggleCategories();
      if (justPressed(3)) toggleSearch();
      if (justPressed(4)) setActive(activeIndex - 1);
      if (justPressed(5)) setActive(activeIndex + 1);
      for (let index = 0; index < pad.buttons.length; index++) gamepadButtons.set(index, pressed(index));
    }
    requestAnimationFrame(pollGamepads);
  }
  window.addEventListener("gamepadconnected", () => { if (!running) { running = true; pollGamepads(); } });
  running = true;
  pollGamepads();

  store.dataset.view = "platform";
  renderPlatforms();
});
