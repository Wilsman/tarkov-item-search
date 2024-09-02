document.addEventListener("DOMContentLoaded", () => {
  const searchBox = document.getElementById("searchBox");
  const body = document.querySelector("body");
  const pveToggle = document.getElementById("pveToggle");

  // Initialize search and display map bosses when the page loads
  performSearch();
  displayMapBosses();

  // Save the toggle state to a cookie when it changes
  pveToggle.addEventListener("change", function () {
    document.cookie = `pveToggle=${this.checked};path=/;max-age=31536000`; // Save for 1 year
    togglePveMode(this.checked);
    performSearch();
  });

  // Read the cookie and set the toggle state when the page loads
  const pveToggleState = document.cookie
    .split("; ")
    .find((row) => row.startsWith("pveToggle="));
  if (pveToggleState) {
    pveToggle.checked = pveToggleState.split("=")[1] === "true";
    togglePveMode(pveToggle.checked);
  }

  // Debounce function
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Enhanced search function with debounce
  const debouncedSearch = debounce(() => {
    performSearch();
  }, 250);

  // Event listeners
  searchBox.addEventListener("focus", () => {
    body.classList.add("search-active");
    searchBox.value = "";
  });
  searchBox.addEventListener("input", debouncedSearch);
  searchBox.addEventListener("click", () => {
    if (searchBox.value !== "") {
      searchBox.value = "";
      performSearch();
    }
  });
  searchBox.addEventListener("blur", () =>
    body.classList.remove("search-active")
  );

  if (!/Mobi|Android/i.test(navigator.userAgent)) {
    window.addEventListener("focus", () => searchBox.focus());
    document.addEventListener("keydown", (event) => {
      if (!searchBox.contains(event.target)) searchBox.focus();
    });
  }

  const clearButton = document.getElementById("clearButton");
  clearButton.addEventListener("click", clearSearch);
});

function clearSearch() {
  const searchBox = document.getElementById("searchBox");
  searchBox.value = "";
  performSearch();
}

async function togglePveMode(isPve) {
  try {
    const response = await fetch("/toggle_pve", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ pve_toggle: isPve }),
    });
    const data = await response.json();
    console.log("PvE mode toggled:", data.pve_mode);
  } catch (error) {
    console.error("Error toggling PvE mode:", error);
  }
}

async function performSearch() {
  const query = document.getElementById("searchBox").value.trim();
  const container = document.querySelector(".container");
  const isPve = document.getElementById("pveToggle").checked;
  const loadingThrobber = document.getElementById("loadingThrobber");
  const resultsContainer = document.getElementById("results");

  if (!query) {
    loadingThrobber.style.display = "flex";
    resultsContainer.innerHTML = ""; // Clear previous results
    displayMapBosses();
    return;
  }

  try {
    const response = await fetch(
      `/search?query=${encodeURIComponent(query)}&pve=${isPve}`
    );
    const data = await response.json();
    updateSearchResults(data, container);
    updateCacheTimes(data.cache_times);
  } catch (error) {
    console.error("Error:", error);
  }
}

function updateSearchResults(data, container) {
  const resultsContainer = document.getElementById("results");
  resultsContainer.innerHTML = "";
  resultsContainer.className = "results-container";

  container.classList.toggle("top", data.items.length === 0);

  data.items.forEach((item) => {
    const itemCard = createItemCard(item);
    resultsContainer.appendChild(itemCard);
  });
}

function createItemCard(item) {
  const itemCard = document.createElement("div");
  itemCard.classList.add("item-card");
  itemCard.innerHTML = `
    <a href="${item.wikiLink}" target="_blank" class="item-link">
      <div class="item-content">
        <img src="${item.icon}" alt="Item Icon" class="item-icon">
        <div class="item-details">
          <p class="item-name">${item.shortName}</p>
          <p class="price">${formatPrice(item.price)}</p>
          <p class="trader-info">${item.traderPriceCur} ${item.traderPrice.toLocaleString()}<span class="trader-name"> - ${item.traderName}</span></p>
        </div>
      </div>
    </a>
    <hr class="divider">
  `;
  return itemCard;
}

function formatPrice(price) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
    .format(price)
    .substring(3)
    .replace(/,/g, ",");
}

function displayMapBosses() {
  const loadingThrobber = document.getElementById("loadingThrobber");
  const resultsContainer = document.getElementById("results");

  loadingThrobber.style.display = "flex";
  resultsContainer.innerHTML = ""; // Clear previous results
  
  cycleLoadingMessages(); // Start cycling loading messages

  fetch("/map_bosses")
    .then((response) => response.json())
    .then((data) => {
      resultsContainer.innerHTML =
        "<h5>Boss Spawn Chances</h5>" + createBossTable(data.map_bosses);
      updateCacheTimes(data.cache_times);
      loadingThrobber.style.display = "none";
    })
    .catch((error) => {
      console.error("Error:", error);
      resultsContainer.innerHTML =
        "<p>Error loading boss data. Please try again.</p>";
      loadingThrobber.style.display = "none";
    });
}

function createBossTable(mapBosses) {
  let tableHTML = '<table class="boss-table">';
  for (let mapName in mapBosses) {
    tableHTML += `<tr><th>${mapName}</th>${mapBosses[mapName]
      .map((boss) => `<td>${boss[0]} \n${boss[1]}%</td>`)
      .join("")}</tr>`;
  }
  tableHTML += "</table>";
  return tableHTML;
}

function updateCacheTimes(cacheTimes) {
  const cacheTimesContainer = document.getElementById("cacheTimes");
  if (cacheTimesContainer) {
    cacheTimesContainer.innerHTML = `
      <p>PvE Cache: ${getCacheTimeString(cacheTimes["item_cache_pve.json"])}</p>
      <p>PvP Cache: ${getCacheTimeString(cacheTimes["item_cache_pvp.json"])}</p>
      <p>Map Bosses Cache: ${getCacheTimeString(cacheTimes["map_bosses_cache.json"])}</p>
    `;
  }
}

function getCacheTimeString(cacheTime) {
  if (cacheTime && cacheTime.formatted && cacheTime.relative) {
    return `${cacheTime.formatted} (${cacheTime.relative})`;
  }
  return "Not available";
}

function cycleLoadingMessages() {
  const messages = [
    "Loading boss data...",
    "Scanning the maps...",
    "Checking spawn rates...",
    "Analyzing boss locations...",
    "Preparing intel..."
  ];
  let index = 0;
  const loadingText = document.querySelector(".loading-throbber p");
  
  setInterval(() => {
    loadingText.textContent = messages[index];
    index = (index + 1) % messages.length;
  }, 2000); // Change message every 2 seconds
}
