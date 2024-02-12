function performSearch() {
    let query = document.getElementById('searchBox').value;
    fetch(`/search?query=${encodeURIComponent(query)}`)
        .then(response => response.json())
        .then(data => {
            let resultsContainer = document.getElementById('results');
            resultsContainer.innerHTML = '';
            resultsContainer.className = 'results-table'; // Add this line

            // Create table headers
            let thead = document.createElement('thead');
            let headers = ['Icon', 'Name', 'Price', 'Sell to Trader', 'Updated'];
            let trHead = document.createElement('tr');
            headers.forEach(header => {
                let th = document.createElement('th');
                th.appendChild(document.createTextNode(header));
                trHead.appendChild(th);
            });
            thead.appendChild(trHead);
            resultsContainer.appendChild(thead);
            
            // Use data.items to access the items array
            data.items.forEach(item => {
                let tr = document.createElement('tr');
                tr.classList.add('result-row'); // Add CSS class for spacing

                let tdIcon = document.createElement('td');
                let icon = document.createElement('img');
                icon.src = item.icon;
                icon.alt = 'Item Icon';
                icon.style.width = '75px';
                icon.style.height = 'auto';
                tdIcon.appendChild(icon);

                let tdShortName = document.createElement('td');
                let shortName = document.createTextNode(item.shortName);
                tdShortName.appendChild(shortName);

                let tdPrice = document.createElement('td');
                let price = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'RUB', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(item.price);
                price = '₽' + price.substring(3).replace(/,/g, ',');
                let priceNode = document.createTextNode(price);
                tdPrice.appendChild(priceNode);

                let tdTrader = document.createElement('td');
                let traderPrice = item.traderPrice;
                traderPrice = traderPrice.toLocaleString();
                let trader = document.createElement('div');
                trader.innerHTML = item.traderPriceCur + ' ' + traderPrice + '<br><span style="font-size: 10px;">' + item.traderName + '</span>'; // Set smaller font size for traderName
                tdTrader.appendChild(trader);

                let tdUpdated = document.createElement('td');
                let updated = new Date(item.updated).toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric' });
                let updatedNode = document.createTextNode(updated);
                tdUpdated.appendChild(updatedNode);

                tr.appendChild(tdIcon);
                tr.appendChild(tdShortName);
                tr.appendChild(tdPrice);
                tr.appendChild(tdTrader);
                tr.appendChild(tdUpdated);
                resultsContainer.appendChild(tr);
            });
        })
        .catch(error => {
            console.error('Error:', error);
        });
}
