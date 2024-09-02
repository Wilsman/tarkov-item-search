document.addEventListener("DOMContentLoaded", () => {
  const searchBox = document.getElementById("searchBox");
  const body = document.querySelector("body");
  const pveToggle = document.getElementById("pveToggle");

  // Initialize search and display map bosses when the page loads
  performSearch();

  // Fetch and display map bosses when the page loads
  displayMapBosses();

  // Save the toggle state to a cookie when it changes
  pveToggle.addEventListener("change", function () {
    document.cookie = `pveToggle=${this.checked};path=/;max-age=31536000`; // Save for 1 year
    performSearch(); // Perform search again with the new toggle state
  });

  // Read the cookie and set the toggle state when the page loads
  const pveToggleState = document.cookie
    .split("; ")
    .find((row) => row.startsWith("pveToggle="));
  if (pveToggleState) {
    pveToggle.checked = pveToggleState.split("=")[1] === "true";
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
  }, 250); // Adjust the delay as needed

  // Simplify event listener attachments
  const events = [
    {
      target: searchBox,
      type: "focus",
      action: () => {
        body.classList.add("search-active");
        searchBox.value = ""; // Clear the text in the search box on focus
      },
    },
    {
      target: searchBox,
      type: "input",
      action: debouncedSearch,
    },
    {
      target: searchBox,
      type: "click",
      action: () => {
        if (searchBox.value !== "") {
          searchBox.value = ""; // Clear the text in the search box on click
          performSearch();
        }
      },
    },
    {
      target: searchBox,
      type: "blur",
      action: () => body.classList.remove("search-active"),
    },
    {
      target: window,
      type: "focus",
      condition: () => !/Mobi|Android/i.test(navigator.userAgent),
      action: () => searchBox.focus(),
    },
    {
      target: document,
      type: "keydown",
      condition: () => !/Mobi|Android/i.test(navigator.userAgent),
      action: (event) => {
        if (!searchBox.contains(event.target)) searchBox.focus();
      },
    },
  ];

  events.forEach(({ target, type, condition, action }) => {
    target.addEventListener(type, (event) => {
      if (!condition || condition(event)) {
        if (action) action(event);
      }
    });
  });
});

async function performSearch() {
  const query = document.getElementById("searchBox").value.trim();
  const container = document.querySelector(".container");
  const isPve = document.getElementById("pveToggle").checked;

  if (!query) {
    displayMapBosses();
    return;
  }

  try {
    const response = await fetch(
      `/search?query=${encodeURIComponent(query)}&pve=${isPve}`
    );
    const data = await response.json();
    updateSearchResults(data, container);
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
    <img src="${item.icon}" alt="Item Icon" class="item-icon">
    <p class="item-name">${item.shortName}</p>
    <p class="price">${formatPrice(item.price)}</p>
    <p class="trader-info">${
      item.traderPriceCur
    } ${item.traderPrice.toLocaleString()}<span class="trader-name"> - ${
    item.traderName
  }</span></p>
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
  fetch("/map_bosses")
    .then((response) => response.json())
    .then((data) => {
      // console.log(JSON.stringify(data)); // Print the full JSON to the console
      const resultsContainer = document.getElementById("results");
      resultsContainer.innerHTML =
        "<h5>Boss Spawn Chances</h5>" + createBossTable(data);
    })
    .catch((error) => console.error("Error:", error));
}

function createBossTable(data) {
  let tableHTML = '<table class="boss-table">';
  for (let mapName in data) {
    tableHTML += `<tr><th>${mapName}</th>${data[mapName]
      .map((boss) => `<td>${boss[0]} \n${boss[1]}%</td>`)
      .join("")}</tr>`;
  }
  tableHTML += "</table>";
  return tableHTML;
}
