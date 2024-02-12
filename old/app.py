import os
import json
import time
import requests
from datetime import datetime
from flask import Flask, request, jsonify, render_template

app = Flask(__name__)
CACHE_FILE = "item_cache.json"
CACHE_TIME = 3600  # Cache duration in seconds


def fetch_and_cache_items():
    if (
        not os.path.exists(CACHE_FILE)
        or time.time() - os.path.getmtime(CACHE_FILE) >= CACHE_TIME
    ):
        headers = {"x-api-key": "clKm8zAsDjYv0eiy"}
        response = requests.get(
            "https://api.tarkov-market.app/api/v1/items/all", headers=headers
        )
        if response.status_code == 200:
            items = response.json()
            with open(CACHE_FILE, "w") as cache:
                json.dump(items, cache)
        else:
            raise Exception(f"Failed to fetch items: {response.status_code}")


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/search")
def perform_search():
    query = request.args.get("query", "").lower()

    # Try to load from cache first
    try:
        with open(CACHE_FILE, "r") as cache:
            last_fetch_time = os.path.getmtime(CACHE_FILE)
            items = json.load(cache)
            using_cache = time.time() - last_fetch_time < CACHE_TIME
    except FileNotFoundError:
        items = []
        using_cache = False

    if using_cache:
        print(
            "Using cached data",
            datetime.fromtimestamp(last_fetch_time).strftime("%Y-%m-%d %H:%M:%S"),
        )

    # Fetch and cache if not using cache
    if not using_cache:
        fetch_and_cache_items()
        with open(CACHE_FILE, "r") as cache:
            items = json.load(cache)

    # Filter the cached items based on the query
    filtered_items = [
        {
            "name": item["name"],
            "shortName": item["shortName"],
            "price": item["price"],
            "icon": item.get("icon", "No icon available"),
            "traderName": item.get("traderName", "No trader available"),
            "traderPrice": item.get("traderPrice", "No trader price available"),
            "traderPriceCur": item.get(
                "traderPriceCur", "No trader price currency available"
            ),
            "updated": item.get("updated", "No update available"),
        }
        for item in items
        if query in item["name"].lower()
    ][
        :15
    ]  # Slice the first 15 items

    # Add a flag to the response indicating if the data is from cache
    return jsonify({"items": filtered_items, "using_cache": using_cache})


if __name__ == "__main__":
    app.run(debug=True)
