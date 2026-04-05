const searchBtn = document.getElementById("searchBtn");
const loadMoreBtn = document.getElementById("loadMoreBtn");
const searchInput = document.getElementById("searchInput");
const statusText = document.getElementById("status");
const results = document.getElementById("results");

let currentSearchTerm = "";
let currentPage = 1;
let hasMoreResults = false;
let symbolMap = {};

searchBtn.addEventListener("click", runSearch);
loadMoreBtn.addEventListener("click", loadMoreResults);

searchInput.addEventListener("keydown", function (event) {
  // Let users press Enter instead of clicking the button every time
  if (event.key === "Enter") {
    runSearch();
  }
});

// Load mana symbol images early so rendering looks nicer later
loadSymbolMap();

async function loadSymbolMap() {
  try {
    const response = await fetch("https://api.scryfall.com/symbology");

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const data = await response.json();

    symbolMap = {};

    (data.data || []).forEach(function (symbol) {
      symbolMap[symbol.symbol] = symbol.svg_uri;
    });
  } catch (error) {
    console.error("Could not load symbol map:", error);
    // Not fatal. The app can still work without symbol icons.
  }
}

async function runSearch() {
  const term = searchInput.value.trim();

  if (!term) {
    statusText.textContent = "Please enter a search term.";
    results.innerHTML = "";
    loadMoreBtn.hidden = true;
    return;
  }

  currentSearchTerm = term;
  currentPage = 1;

  statusText.textContent = "Loading...";
  results.innerHTML = "";
  searchBtn.disabled = true;
  loadMoreBtn.hidden = true;

  try {
    await fetchAndRenderCards(currentSearchTerm, currentPage, false);
  } catch (error) {
    console.error(error);
    statusText.textContent = "Something went wrong. Please try again.";
    results.innerHTML = "";
  } finally {
    searchBtn.disabled = false;
  }
}

async function loadMoreResults() {
  currentPage += 1;
  loadMoreBtn.disabled = true;
  statusText.textContent = "Loading more results...";

  try {
    await fetchAndRenderCards(currentSearchTerm, currentPage, true);
  } catch (error) {
    console.error(error);
    statusText.textContent = "Something went wrong while loading more results.";
    currentPage -= 1; // roll back page count if that request failed
  } finally {
    loadMoreBtn.disabled = false;
  }
}

async function fetchAndRenderCards(term, page, appendResults) {
  const url =
    `https://api.scryfall.com/cards/search?q=${encodeURIComponent(term)}&page=${page}`;

  const response = await fetch(url);

  if (!response.ok) {
    if (response.status === 404) {
      statusText.textContent = "No results found.";
      loadMoreBtn.hidden = true;
      return;
    }

    throw new Error(`HTTP error: ${response.status}`);
  }

  const data = await response.json();
  const cards = data.data || [];

  if (cards.length === 0 && page === 1) {
    statusText.textContent = "No results found.";
    loadMoreBtn.hidden = true;
    return;
  }

  hasMoreResults = data.has_more === true;

  const cardsHtml = buildCardsHtml(cards);

  if (appendResults) {
    results.innerHTML += cardsHtml;
  } else {
    results.innerHTML = cardsHtml;
  }

  const totalShown = results.querySelectorAll(".card").length;
  statusText.textContent = `Showing ${totalShown} result(s).`;

  loadMoreBtn.hidden = !hasMoreResults;
}

function buildCardsHtml(cards) {
  // Keeping this simple on purpose: build one chunk of HTML and drop it in
  return cards
    .slice(0, 15)
    .map(function (card) {
      const imageUrl =
        card.image_uris?.normal ||
        card.card_faces?.[0]?.image_uris?.normal ||
        "";

      const cardName = card.name || "Unknown Card";
      const manaCost = renderManaCost(card.mana_cost || "");
      const typeLine = card.type_line || "N/A";
      const setName = card.set_name || "N/A";
      const rarity = card.rarity || "N/A";

      return `
        <article class="card">
          <h2>${cardName}</h2>
          <p><strong>Mana Cost:</strong> ${manaCost}</p>
          <p><strong>Type:</strong> ${typeLine}</p>
          <p><strong>Set:</strong> ${setName}</p>
          <p><strong>Rarity:</strong> ${rarity}</p>
          ${imageUrl ? `<img class="card-image" src="${imageUrl}" alt="${cardName}">` : ""}
        </article>
      `;
    })
    .join("");
}

function renderManaCost(manaCost) {
  // Converts things like {2}{R}{R} into symbol images when possible
  if (!manaCost) {
    return "N/A";
  }

  const symbols = manaCost.match(/\{[^}]+\}/g);

  if (!symbols) {
    return manaCost;
  }

  const renderedSymbols = symbols
    .map(function (symbol) {
      const symbolUrl = symbolMap[symbol];

      if (symbolUrl) {
        return `<img src="${symbolUrl}" alt="${symbol}">`;
      }

      // fallback in case the symbol map didn't load or misses something
      return `<span>${symbol}</span>`;
    })
    .join("");

  return `<span class="mana-cost">${renderedSymbols}</span>`;
}

/*
⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿
⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠿⡿⢿⣿⢿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿
⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠟⠋⠁⠀⠀⠀⠀⠀⠀⠉⠙⠺⢽⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿
⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡿⠃⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠻⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿
⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡟⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠘⢿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿
⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⢿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿
⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿
⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠙⢿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿
⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡟⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣰⣄⠀⠀⣤⢤⡀⠀⠀⠀⣾⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿
⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣼⢦⡀⢈⡿⠼⡆⢀⡏⢸⣇⠀⠀⠀⢹⡏⠀⠀⠀⠀⠀⠉⠉⠛⠻⢿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿
⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠸⡿⠛⡇⢸⠁⢀⡇⢸⡇⠈⣿⠀⠀⠀⢸⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⠛⢿⣿⣿⣿⣿⣿⣿⣿⣿⣿
⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣦⠀⠁⠄⠀⠀⠀⠀⠀⠀⣧⠀⢿⢸⡀⠸⣷⣸⠁⠀⡿⠀⣠⣤⣸⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠛⣿⣿⣿⣿⣿⣿⣿
⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣦⡀⢸⡍⠹⣶⠛⠋⢹⠀⠸⣶⡇⠀⣿⠏⠀⢠⡇⣰⠇⢿⠇⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠛⣿⣿⣿⣿
⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡇⠙⢞⣷⡀⠙⢿⣶⣾⡄⠐⠙⠂⠀⠀⠀⠀⢸⣧⠏⠀⣸⢠⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠘⣿⣿⣿⣿
⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣷⡄⠀⠉⢙⣳⣄⡈⠉⠁⠀⠀⠀⠀⠀⠀⠀⠀⠁⠀⣰⡇⣾⠃⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⣿⣿⣿⣿
⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣆⠀⠀⠹⡟⡗⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⡾⠏⣰⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠘⢿⣿⣿⣿
⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠏⠹⢧⣄⣠⠓⣻⠀⠀⠀⠀⠀⠀⠀⣀⢰⣾⠏⠀⣠⡿⠀⠀⠀⠀⠀⠀⠀⢀⣄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠘⣿⣿
⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠀⣾⣿⠀⠁⠀⢻⡄⠀⠀⠀⠀⠀⠀⠙⠻⣧⡀⣰⡟⠀⠀⠀⠀⠀⠀⠀⠀⢸⡿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣿⣿⣿
⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡇⣰⡧⠀⠀⠀⠀⠀⠙⣦⠀⠀⠀⠀⠀⠀⠀⠈⢿⣭⠆⠀⠀⠀⠀⠀⠀⠀⢀⣾⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⡀⠀⠀⠀⢹⣿⣿
⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣟⣰⠏⠀⠀⠀⠀⠀⠀⠀⣿⣆⠀⠀⠀⠀⠀⠀⠀⠀⠙⢿⣄⢲⣆⠀⠀⠀⠀⢸⣿⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣾⣷⠀⠀⠀⠸⣿⣿
⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡟⠁⠀⠀⠀⠀⠀⠀⠀⣸⠃⣹⣆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠙⣦⠼⠀⠀⠀⣰⡟⠃⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣿⣿⠀⠀⠀⠀⢻⣿
⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡏⠀⠀⠀⠀⠀⠀⠀⠀⢠⠏⣠⣿⣿⣦⡀⠀⠀⠀⠀⠀⠀⠀⠀⠈⢷⣤⠀⣀⣿⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣾⣿⠏⠀⠀⠀⠀⠘⣿
⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣧⠀⠀⠀⠀⠀⠀⠀⢠⣿⣶⣿⣿⣿⣿⣿⡄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⢳⣼⣿⣿⡆⠀⠀⠀⠀⠀⠀⠀⠀⠀⢠⣿⣿⠀⠀⠀⠀⠀⠀⢻
⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠀⠀⠀⠀⠀⠀⠀⣿⣿⣿⣿⣿⣿⣿⣿⣿⣦⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠻⣿⣇⠻⣦⡀⠀⠀⠀⠀⠀⠀⠀⣿⣿⡏⠀⠀⠀⠀⠀⠀⢸
⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣧⠀⠀⠀⠀⠀⢸⣿⣿⣿⣿⣿⣿⣿⣿⣿⡌⢻⣦⠀⠀⠀⠀⠀⠀⠀⠀⠀⠙⠟⠀⠈⠻⢦⡀⠀⠀⠀⠀⢰⣿⣿⠁⠀⠀⠀⠀⠀⠀
⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡄⠀⠀⠀⢀⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡆⠘⢷⡄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⢻⡄⠀⠀⢀⣿⣿⡇⠀⠀⠀⠀⠀⠀⠀
⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣧⠀⠀⠀⣾⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡄⠈⢿⣦⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣿⡀⢀⣾⣿⣿⠁⠀⠀⠀⠀⠀⠀⠀
⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠀⢀⣼⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡇⠈⠻⡟⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⠉⠛⠻⡟⠛⠻⡟⠛⠻⡟
*/