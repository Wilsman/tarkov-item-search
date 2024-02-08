function performSearch() {
    let query = document.getElementById('searchBox').value;
    fetch(`/search?query=${encodeURIComponent(query)}`)
        .then(response => response.json())
        .then(data => {
            let resultsContainer = document.getElementById('results');
            resultsContainer.innerHTML = ''; // Clear previous results
            
            // Create a table element
            let table = document.createElement('table');
            table.className = 'results-table'; // Add class for styling

            // Add table header
            let thead = table.createTHead();
            let headerRow = thead.insertRow();
            let headers = ["Image", "Name", "Price"];
            headers.forEach(headerText => {
                let header = document.createElement('th');
                let textNode = document.createTextNode(headerText);
                header.appendChild(textNode);
                headerRow.appendChild(header);
            });

            // Create a tbody element
            let tbody = table.createTBody();

            data.forEach(item => {
                let row = tbody.insertRow();
                
                let cellImage = row.insertCell();
                let img = document.createElement('img');
                img.src = item.icon;
                img.alt = 'Item Icon';
                img.className = 'result-icon'; // Add class for styling
                cellImage.appendChild(img);
                
                let cellName = row.insertCell();
                cellName.textContent = item.name;

                let cellPrice = row.insertCell();
                cellPrice.textContent = `$${item.price}`;
            });

            // Append the table to the results container
            resultsContainer.appendChild(table);
        })
        .catch(error => {
            console.error('Error:', error);
        });
}
