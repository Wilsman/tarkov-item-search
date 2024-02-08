import requests
from flask import Flask, request, jsonify, render_template

app = Flask(__name__)


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/search")
def search():
    query = request.args.get("query", "")
    headers = {"x-api-key": "clKm8zAsDjYv0eiy"}  # Replace with your actual API key
    response = requests.get(
        f"https://api.tarkov-market.app/api/v1/item?q={query}", headers=headers
    )
    if response.status_code == 200:
        try:
            items = response.json()
            # Extract relevant data
            formatted_items = [
                {
                    "name": item["name"],
                    "price": item["price"],
                    "image": item.get("imgBig", item.get("img", "No image available")),
                    "icon": item.get(
                        "icon", "No icon available"
                    ),  # Include the icon URL
                }
                for item in items
            ]

            return jsonify(formatted_items)
        except ValueError:
            return jsonify({"error": "Error decoding JSON response"}), 500
    else:
        return (
            jsonify(
                {"error": "API request failed", "status_code": response.status_code}
            ),
            500,
        )


if __name__ == "__main__":
    app.run(debug=True)
