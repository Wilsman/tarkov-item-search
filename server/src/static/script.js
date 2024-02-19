document.addEventListener("DOMContentLoaded", (event) => {
  let searchBox = document.getElementById("searchBox");
  let body = document.querySelector("body");

  // Perform search with the default value
  performSearch();

  searchBox.addEventListener("keyup", function (event) {
    if (event.key === "Enter") {
      searchBox.blur(); // This will hide the keyboard on mobile devices
      performSearch();
    }
  });

  searchBox.addEventListener("focus", function () {
    body.classList.add("search-active");
    searchBox.value = ""; // Clear the search box when it is focused
    performSearch(); // Call performSearch to update the results
  });

  searchBox.addEventListener("blur", function () {
    body.classList.remove("search-active");
  });

  if (!/Mobi|Android/i.test(navigator.userAgent)) {
    window.addEventListener("focus", function () {
      searchBox.focus();
      performSearch(); // Perform search with the empty query
    });
  }

  if (!/Mobi|Android/i.test(navigator.userAgent)) {
    // Redirect all keypresses to the search box
    document.addEventListener("keydown", function (event) {
      if (!searchBox.contains(event.target)) {
        searchBox.focus();
      }
    });
  }
});

function clearSearch() {
  document.getElementById("searchBox").value = "";
  performSearch(); // Call performSearch to update the results
}

function performSearch() {
  let query = document.getElementById("searchBox").value;
  let container = document.querySelector(".container");
  fetch(`/search?query=${encodeURIComponent(query)}`)
    .then((response) => response.json())
    .then((data) => {
      let resultsContainer = document.getElementById("results");
      resultsContainer.innerHTML = "";
      resultsContainer.className = "results-container";

      if (data.items.length === 0) {
        // If there are no results, add a class to the container to move it up
        container.classList.add("top");
      } else {
        // If there are results, remove the class that moves the container up
        container.classList.remove("top");
      }

      data.items.forEach((item) => {
        let itemCard = document.createElement("div");
        itemCard.classList.add("item-card");

        let icon = document.createElement("img");
        icon.src = item.icon;
        icon.alt = "Item Icon";
        icon.classList.add("item-icon");
        itemCard.appendChild(icon);

        let shortName = document.createElement("p");
        shortName.textContent = item.shortName;
        shortName.classList.add("item-name");
        itemCard.appendChild(shortName);

        let priceNode = document.createElement("p");
        let price = new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "RUB",
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(item.price);
        priceNode.textContent = "₽" + price.substring(3).replace(/,/g, ",");
        priceNode.classList.add("price");
        itemCard.appendChild(priceNode);

        let traderInfo = document.createElement("p");
        let traderPrice = item.traderPrice.toLocaleString();
        traderInfo.innerHTML =
          item.traderPriceCur +
          " " +
          traderPrice +
          '<span class="trader-name">' +
          " - " +
          item.traderName +
          "</span>";
        traderInfo.classList.add("trader-info");
        itemCard.appendChild(traderInfo);

        // Add horizontal line as a divider
        let divider = document.createElement("hr");
        divider.classList.add("divider");
        itemCard.appendChild(divider);

        resultsContainer.appendChild(itemCard);
      });
    })
    .catch((error) => {
      console.error("Error:", error);
    });
}
